import fs from "node:fs/promises";
import { draftOrQuestions, searchJobs } from "./adapters.mjs";
import { deliver } from "./slack.mjs";
// Run this host process manually. OS autostart is intentionally not registered here.
const base = process.env.JOBPREP_URL || "http://127.0.0.1:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))
  throw Error("Runner only connects to a loopback service.");
let token = process.env.RUNNER_TOKEN;
const privateConfig = await fs.readFile(
  new URL("../.env", import.meta.url),
  "utf8",
);
token ||= privateConfig.match(/^RUNNER_TOKEN=(.+)$/m)?.[1].trim();
const slackWebhook =
  process.env.SLACK_WEBHOOK ||
  privateConfig.match(/^SLACK_WEBHOOK=(.+)$/m)?.[1].trim();
const slackApproved =
  (process.env.JOBPREP_SLACK_APPROVED ||
    privateConfig.match(/^JOBPREP_SLACK_APPROVED=(.+)$/m)?.[1].trim()) ===
  "true";
if (!token) throw Error("Private runner token is not configured.");
const codex = process.env.JOBPREP_CODEX_EXE,
  agy = process.env.JOBPREP_AGY_EXE;
// Capabilities must be explicitly enabled after a successful subscription-login probe.
const capabilities = {
  draft: !!codex && process.env.JOBPREP_CODEX_VERIFIED === "true",
  questions: !!codex && process.env.JOBPREP_CODEX_VERIFIED === "true",
  search: !!agy && process.env.JOBPREP_SEARCH_VERIFIED === "true",
  slack: !!slackWebhook && slackApproved,
};
async function api(route, data = {}) {
  const r = await fetch(base + route, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw Error(`Runner API ${r.status}`);
  return r.json();
}
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
const heartbeat = setInterval(
  () => api("/api/runner/heartbeat", { capabilities }).catch(() => {}),
  30000,
);
try {
  while (!stopping) {
    try {
      await api("/api/runner/heartbeat", { capabilities });
      await api("/api/runner/tick");
      const { task } = await api("/api/runner/claim");
      if (task) {
        const cancellation = new AbortController();
        const pulse = setInterval(
          () =>
            api(`/api/runner/tasks/${task.id}/heartbeat`, {
              attemptToken: task.attempt_token,
            }).catch(() => cancellation.abort()),
          10000,
        );
        let result;
        try {
          result = !capabilities[task.type]
            ? { errorCode: "UNSUPPORTED" }
            : task.type === "search"
              ? await searchJobs(task, agy, cancellation.signal)
              : await draftOrQuestions(task, codex, cancellation.signal);
        } finally {
          clearInterval(pulse);
        }
        await api(`/api/runner/tasks/${task.id}/complete`, {
          attemptToken: task.attempt_token,
          ...result,
        });
        console.log(
          `Task ${task.type}: ${result.errorCode || "completed; awaiting user review"}`,
        );
      }
    } catch (e) {
      console.error("Runner unavailable; will check again in 30 seconds.");
    }
    // Enable only after the user's separate actual-message approval. Secrets remain host-only.
    if (slackApproved && slackWebhook) {
      try {
        const { notification } = await api("/api/runner/notifications/claim");
        if (notification) {
          const status = await deliver(slackWebhook, notification.payload);
          await api("/api/runner/notifications/complete", {
            userId: notification.userId,
            key: notification.key,
            status,
          });
        }
      } catch {
        console.error(
          "Notification check unavailable; search results are preserved.",
        );
      }
    }
    if (process.argv.includes("--once")) break;
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
} finally {
  clearInterval(heartbeat);
}
