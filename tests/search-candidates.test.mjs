import { test } from "node:test";
import assert from "node:assert/strict";
import {
  candidateUrl,
  parseCandidates,
  resolveCandidate,
} from "../runner/search-candidates.mjs";
const url =
  "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc_123==";
const stream = (data, extra = {}, searched = true) =>
  [
    ...(searched
      ? [
          {
            event: "step_update",
            step_update: {
              step_type: "tool",
              state: "DONE",
              tool_name: "search_web",
            },
          },
        ]
      : []),
    {
      event: "result",
      result: { status: "SUCCESS", response: JSON.stringify(data), ...extra },
    },
  ]
    .map((x) => JSON.stringify(x))
    .join("\n");
test("real nested search result accepts redirects as unverified candidates only", () => {
  const r = parseCandidates(
    stream({ blocked: false, candidates: [{ url }, { url }] }),
  );
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].kind, "google-redirect");
  assert.equal(r.result, undefined);
  assert.equal(candidateUrl("https://www.wanted.co.kr/wd/123").kind, "direct");
});
test("candidate parser fails closed on failed search, missing tool, denied actions and excess results", () => {
  const data = { blocked: false, candidates: [{ url }] };
  for (const output of [
    stream(data, { status: "ERROR" }),
    stream(data, { denied_actions: ["read_url"] }),
    stream(data, {}, false),
    stream({ ...data, blocked: true }),
    stream({ ...data, candidates: Array(6).fill({ url }) }),
  ])
    assert.ok(parseCandidates(output).errorCode);
});
test("candidate URLs exclude arbitrary hosts, credentials, queries and lookalikes", () => {
  for (const url of [
    "http://www.wanted.co.kr/wd/1",
    "https://www.wanted.co.kr.evil.test/wd/1",
    "https://user@www.wanted.co.kr/wd/1",
    "https://vertexaisearch.cloud.google.com/other/abc",
    "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc?url=http://localhost",
    "https://127.0.0.1/wd/1",
  ])
    assert.throws(() => candidateUrl(url));
});
test("tool failure cannot be hidden by a successful terminal response", () => {
  const events = stream({ blocked: false, candidates: [{ url }] })
    .split("\n")
    .map((x) => JSON.parse(x));
  events[0].step_update.tool_info = { error: { type: "NETWORK_ERROR" } };
  assert.equal(
    parseCandidates(events.map((x) => JSON.stringify(x)).join("\n")).errorCode,
    "SEARCH_FAILED",
  );
});
test("CLI exit-zero terminal quota error is still a usage limit", () => {
  const result = parseCandidates(
    JSON.stringify({
      event: "result",
      result: { status: "ERROR", error: "RESOURCE_EXHAUSTED: quota exceeded" },
    }),
  );
  assert.equal(result.errorCode, "LIMIT_REACHED");
});
test("redirect resolution makes no request without approval and never follows an arbitrary target", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    throw Error("should not call");
  };
  await assert.rejects(resolveCandidate(url, { fetcher }), /APPROVAL_REQUIRED/);
  assert.equal(
    await resolveCandidate("https://www.wanted.co.kr/wd/1", { fetcher }),
    "https://www.wanted.co.kr/wd/1",
  );
  assert.equal(calls, 0);
  for (const location of [
    "http://127.0.0.1/secret",
    "https://evil.example/",
    "https://vertexaisearch.cloud.google.com/grounding-api-redirect/next",
  ]) {
    let requests = 0;
    await assert.rejects(
      resolveCandidate(url, {
        googleRedirectApproved: true,
        fetcher: async (_, options) => {
          requests++;
          assert.equal(options.redirect, "manual");
          assert.equal(options.credentials, "omit");
          return new Response(null, { status: 302, headers: { location } });
        },
      }),
    );
    assert.equal(requests, 1);
  }
  assert.equal(
    await resolveCandidate(url, {
      googleRedirectApproved: true,
      fetcher: async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://www.wanted.co.kr/wd/123" },
        }),
    }),
    "https://www.wanted.co.kr/wd/123",
  );
});
