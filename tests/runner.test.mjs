import { test } from "node:test";
import assert from "node:assert/strict";
import { runProcess, loginEnvironment } from "../runner/process.mjs";
import { slackText } from "../runner/slack.mjs";
test("bounded subprocess success, failure, timeout and malformed size", async () => {
  assert.equal(
    (
      await runProcess(process.execPath, ["-e", 'process.stdout.write("ok")'], {
        timeoutMs: 1000,
      })
    ).stdout,
    "ok",
  );
  assert.equal(
    (
      await runProcess(
        process.execPath,
        [
          "-e",
          'process.stderr.write("authentication required");process.exit(1)',
        ],
        { timeoutMs: 1000 },
      )
    ).errorCode,
    "AUTH_REQUIRED",
  );
  assert.equal(
    (
      await runProcess(process.execPath, ["-e", "setTimeout(()=>{},5000)"], {
        timeoutMs: 30,
      })
    ).errorCode,
    "TIMEOUT",
  );
  assert.equal(
    (
      await runProcess(
        process.execPath,
        ["-e", 'process.stdout.write("x".repeat(1100000))'],
        { timeoutMs: 1000 },
      )
    ).errorCode,
    "MALFORMED_OUTPUT",
  );
});
test("host secrets excluded from child environment", () => {
  process.env.RUNNER_TOKEN = "synthetic-token";
  process.env.OPENAI_API_KEY = "synthetic-key";
  const env = loginEnvironment();
  assert.equal(env.RUNNER_TOKEN, undefined);
  assert.equal(env.OPENAI_API_KEY, undefined);
  delete process.env.RUNNER_TOKEN;
  delete process.env.OPENAI_API_KEY;
});
test("cancel signal terminates the bounded child process", async () => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 40);
  const result = await runProcess(
    process.execPath,
    ["-e", "setTimeout(()=>{},5000)"],
    { timeoutMs: 1000, signal: controller.signal },
  );
  assert.equal(result.errorCode, "CANCELLED");
});
test("Slack allows only two product categories, escapes mentions", () => {
  assert.match(
    slackText({
      type: "deadline",
      days: 1,
      company: "<@all>",
      title: "role",
      url: "https://example.com/job",
    }),
    /D-1/,
  );
  assert.doesNotMatch(
    slackText({ type: "deadline", days: 0, company: "<@all>", title: "role" }),
    /<@all>/,
  );
  assert.throws(() => slackText({ type: "deadline", days: 3 }));
  assert.throws(() => slackText({ type: "interview" }));
  assert.throws(() => slackText({ type: "generation" }));
  assert.doesNotMatch(
    slackText({
      type: "summary",
      added: 1,
      changed: 0,
      jobs: [
        {
          company: "fixture",
          title: "role",
          url: "https://example.com/<!channel>",
        },
      ],
    }),
    /<!channel>/,
  );
  assert.match(
    slackText({ type: "summary", added: 0, changed: 1, jobs: [] }),
    /신규 0건/,
  );
});
