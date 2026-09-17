import fs from "node:fs/promises";
import { draftOrQuestions, searchJobs } from "./adapters.mjs";
import { deliver } from "./slack.mjs";
import { notificationPump } from "./notifications.mjs";
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
const googleRedirectApproved =
  (process.env.JOBPREP_GOOGLE_REDIRECT_APPROVED ||
    privateConfig
      .match(/^JOBPREP_GOOGLE_REDIRECT_APPROVED=(.+)$/m)?.[1]
      .trim()) === "true";
// Capabilities must be explicitly enabled after a successful subscription-login probe.
const capabilities = {
  draft: !!codex && process.env.JOBPREP_CODEX_VERIFIED === "true",
  questions: !!codex && process.env.JOBPREP_CODEX_VERIFIED === "true",
  search:
    !!agy &&
    (process.env.JOBPREP_SEARCH_VERIFIED ||
      privateConfig.match(/^JOBPREP_SEARCH_VERIFIED=(.+)$/m)?.[1].trim()) ===
      "true",
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
const notifications = notificationPump({
  api,
  enabled: capabilities.slack,
  send: (payload) => deliver(slackWebhook, payload),
  onError: (message) => console.error(message),
});
const heartbeat = setInterval(
  () => api("/api/runner/heartbeat", { capabilities }).catch(() => {}),
  30000,
);
const notificationTimer = setInterval(() => {
  void notifications.run();
}, 30000);
function stop() {
  stopping = true;
  clearInterval(notificationTimer);
  void notifications.stop();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
try {
  while (!stopping) {
    try {
      await api("/api/runner/heartbeat", { capabilities });
      await api("/api/runner/tick");
      void notifications.run();
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
              ? await searchJobs(task, agy, cancellation.signal, {
                  googleRedirectApproved,
                })
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
    if (stopping) break;
    if (process.argv.includes("--once")) {
      await notifications.run();
      break;
    }
    void notifications.run();
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
} finally {
  clearInterval(heartbeat);
  clearInterval(notificationTimer);
  await notifications.stop();
}
