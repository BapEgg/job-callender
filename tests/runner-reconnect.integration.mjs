// Runs the real host loop against an isolated loopback API; no CLI/DB/Slack calls.
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const requests = [];
let first = true,
  child,
  logs = "";
let done;
const recovered = new Promise((resolve) => {
  done = resolve;
});
const server = http.createServer((req, res) => {
  req.resume();
  requests.push(req.url);
  res.setHeader("content-type", "application/json");
  if (first) {
    first = false;
    res.writeHead(503);
    res.end('{"error":"synthetic outage"}');
    return;
  }
  res.end(
    JSON.stringify(req.url.endsWith("/claim") ? { task: null } : { ok: true }),
  );
  if (req.url === "/api/runner/claim") done();
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let timeout;
try {
  child = spawn(process.execPath, ["runner/main.mjs"], {
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      JOBPREP_URL: `http://127.0.0.1:${server.address().port}`,
      RUNNER_TOKEN: "synthetic-loopback-test-token-only",
      JOBPREP_CODEX_EXE: "",
      JOBPREP_AGY_EXE: "",
      JOBPREP_CODEX_VERIFIED: "false",
      JOBPREP_SEARCH_VERIFIED: "false",
      JOBPREP_SLACK_APPROVED: "false",
    },
  });
  child.stdout.on("data", (b) => {
    logs += b.toString();
  });
  child.stderr.on("data", (b) => {
    logs += b.toString();
  });
  await Promise.race([
    recovered,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(Error("reconnect timeout")), 45000);
    }),
  ]);
  assert.match(logs, /Runner unavailable/);
  assert.ok(requests.includes("/api/runner/tick"));
  assert.ok(requests.filter((x) => x === "/api/runner/heartbeat").length >= 2);
  assert.equal(
    requests.some((x) => x.includes("notification")),
    false,
  );
  await fs.mkdir("artifacts/qa", { recursive: true });
  await fs.writeFile(
    "artifacts/qa/runner-reconnect.json",
    JSON.stringify(
      {
        passed: true,
        scope:
          "real host runner against loopback HTTP503 recovery, no PC sleep or external calls",
        requests,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: real runner recovered from HTTP503 and resumed tick/claim without AI or Slack",
  );
} finally {
  clearTimeout(timeout);
  child?.kill("SIGKILL");
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
