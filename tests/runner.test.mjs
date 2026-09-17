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
import { parseSearchOutput } from "../runner/adapters.mjs";
import {
  parseWantedSource,
  wantedUrl,
  verifyWantedSource,
} from "../runner/posting-source.mjs";
test("original posting rejects closed, hidden, expired, conflicting and mismatched sources", () => {
  const now = new Date("2026-09-17T03:00:00Z");
  const url = "https://www.wanted.co.kr/wd/123";
  const d = {
    id: 123,
    status: "active",
    hidden: false,
    close_time: null,
    company: { company_name: "fixture" },
    position: "백엔드 신입",
    address: { location: "서울" },
    career: { is_newbie: true, annual_from: 0 },
    requirements: "Java / Spring Boot",
  };
  const html = (patch = {}, ld = {}) =>
    `<script id="__NEXT_DATA__">${JSON.stringify({ props: { pageProps: { initialData: { ...d, ...patch } } } })}</script><script type="application/ld+json">${JSON.stringify({ "@type": "JobPosting", ...ld })}</script>`;
  const conditions = { career: "신입", region: "서울, 경기" };
  const parse = (patch, ld, cond = conditions) =>
    parseWantedSource(html(patch, ld), url, cond, now);
  assert.deepEqual(parse().skills, ["Java", "Spring Boot"]);
  assert.equal(parse().closeType, "unknown");
  assert.throws(() => parse({ status: "close" }), /NOT_OPEN/);
  assert.throws(() => parse({ hidden: true }), /NOT_OPEN/);
  assert.throws(() => parse({ close_time: "2024-04-15" }), /NOT_OPEN/);
  assert.throws(
    () => parse({}, { validThrough: "2024-04-15" }),
    /DEADLINE_PASSED/,
  );
  assert.throws(
    () => parse({ due_time: "2026-10-01" }, { validThrough: "2026-10-02" }),
    /CONFLICT/,
  );
  assert.throws(() => parse({ due_time: "2026-10-01Tbad" }), /DATE_INVALID/);
  assert.throws(() => parse({ due_time: "2026-02-30" }), /DATE_INVALID/);
  assert.equal(parse({ due_time: "2026-10-01T00:00:00Z" }).time, "09:00");
  assert.throws(
    () =>
      parse(
        { due_time: "2026-10-01T18:00:00" },
        { validThrough: "2026-10-01T10:00:00" },
      ),
    /CONFLICT/,
  );
  assert.throws(
    () => parse({}, { validThrough: "2026-09-17T10:00:00+14:00" }),
    /DEADLINE_PASSED/,
  );
  assert.throws(
    () =>
      parse(
        { employment_type: "intern" },
        {},
        { ...conditions, employment: "정규직" },
      ),
    /EMPLOYMENT/,
  );
  assert.throws(
    () => parse({ career: { is_newbie: false, annual_from: 3 } }),
    /CAREER/,
  );
  assert.throws(() => parse({ address: { location: "부산" } }), /REGION/);
  assert.throws(() => parse({ id: 124 }), /UNREADABLE/);
  assert.throws(
    () => parse({}, {}, { ...conditions, exclusions: "제외: 계약직" }),
    /REVIEW_REQUIRED/,
  );
  assert.throws(
    () => parseWantedSource("<html></html>", url, {}, now),
    /UNREADABLE/,
  );
});
test("source fetching restricts destination, redirects and response size", async () => {
  for (const url of [
    "http://www.wanted.co.kr/wd/1",
    "https://evil.example/wd/1",
    "https://www.wanted.co.kr@evil.example/wd/1",
    "https://www.wanted.co.kr/wd/1?next=private",
  ])
    assert.throws(() => wantedUrl(url));
  let calls = 0;
  await assert.rejects(
    verifyWantedSource("https://evil.example/wd/1", {}, undefined, async () => {
      calls++;
    }),
  );
  assert.equal(calls, 0);
  await assert.rejects(
    verifyWantedSource(
      "https://www.wanted.co.kr/wd/1",
      {},
      undefined,
      async (_, options) => {
        assert.equal(options.redirect, "error");
        return new Response("x".repeat(3_000_001), {
          headers: { "content-type": "text/html" },
        });
      },
    ),
    /TOO_LARGE/,
  );
});
test("search terminal SUCCESS cannot hide denied reading or expired jobs", () => {
  const read = {
    event: "step_update",
    step_update: {
      step_type: "tool",
      state: "DONE",
      tool_info: { name: "read_url_content" },
    },
  };
  const output = (jobs, extra = {}) =>
    [
      read,
      {
        event: "result",
        result: {
          status: "SUCCESS",
          response: JSON.stringify({ jobs }),
          ...extra,
        },
      },
    ]
      .map((x) => JSON.stringify(x))
      .join("\n");
  assert.equal(
    parseSearchOutput(output([{ deadline: "2024-04-15" }])).errorCode,
    "SEARCH_FAILED",
  );
  assert.equal(
    parseSearchOutput(
      output([{ deadline: null }], { denied_actions: ["read_url"] }),
    ).errorCode,
    "SEARCH_FAILED",
  );
  assert.equal(parseSearchOutput(output([])).errorCode, "SEARCH_FAILED");
  assert.equal(
    parseSearchOutput(
      JSON.stringify({
        status: "SUCCESS",
        response: JSON.stringify({ jobs: [{ deadline: null }] }),
      }),
    ).errorCode,
    "SEARCH_FAILED",
  );
  assert.equal(
    parseSearchOutput(
      output([
        {
          deadline: null,
          closeType: "rolling",
          currentStatus: "open",
          statusEvidence: "접수중",
          verifiedAt: new Date().toISOString(),
        },
      ]),
    ).result.jobs.length,
    1,
  );
});
