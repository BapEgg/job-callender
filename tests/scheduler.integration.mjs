// Runs only against the isolated compose.test.yaml database on port 3001.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { blankState, kstDate } from "../server/domain.mjs";
await fs.mkdir("artifacts/qa", { recursive: true });
const token = (await fs.readFile(".env", "utf8"))
    .match(/^RUNNER_TOKEN=(.+)$/m)[1]
    .trim(),
  base = "http://127.0.0.1:3001",
  results = [];
function sql(text) {
  return execFileSync(
    "docker",
    [
      "compose",
      "-f",
      "compose.test.yaml",
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      "testuser",
      "-d",
      "testdb",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    {
      input: text,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    },
  ).trim();
}
const id = randomUUID(),
  session = randomBytes(32).toString("hex"),
  cookie = "junbisil_session=" + session;
const state = blankState("scheduler-qa"),
  today = kstDate(),
  tomorrow = kstDate(new Date(Date.now() + 86400000)),
  yesterday = kstDate(new Date(Date.now() - 86400000));
state.settings.lastSuccessDate = "2026-01-01";
state.jobs = [
  {
    id: "j",
    company: "Scheduler fixture",
    title: "QA deadline",
    url: "https://example.com/original",
    closeType: "fixed",
    deadline: tomorrow,
  },
];
state.apps = [
  {
    id: "a",
    jobId: "j",
    status: "preparing",
    profile: structuredClone(state.profile),
    questions: [
      {
        id: "q",
        title: "QA",
        prompt: "QA",
        text: "Synthetic answer",
        min: 0,
        max: 100,
        unit: "chars",
        spaces: true,
      },
    ],
    snapshots: [],
    stages: [],
  },
];
sql(
  `BEGIN; INSERT INTO users(id,username,password_hash) VALUES('${id}','scheduler-${id}','test-only-no-login'); INSERT INTO sessions(token_hash,user_id,expires_at) VALUES('${createHash("sha256").update(session).digest("hex")}','${id}',now()+interval '1 hour'); INSERT INTO user_state(user_id,data) VALUES('${id}',convert_from(decode('${Buffer.from(JSON.stringify(state)).toString("base64")}','base64'),'UTF8')::jsonb); COMMIT;`,
);
async function req(route, data = {}, user = false, method = "POST") {
  const r = await fetch(base + route, {
    method,
    headers: {
      origin: base,
      "content-type": "application/json",
      ...(user ? { cookie } : { authorization: "Bearer " + token }),
    },
    body: method === "GET" ? undefined : JSON.stringify(data),
  });
  return { status: r.status, data: await r.json() };
}
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({ name, passed: false, error: e.message.slice(0, 500) });
  }
}
const ownNotifications = () =>
  JSON.parse(
    sql(
      `SELECT COALESCE(json_agg(json_build_object('key',key,'status',status,'payload',payload)),'[]') FROM notification_records WHERE user_id='${id}';`,
    ),
  );
await req("/api/runner/heartbeat", { capabilities: { search: true } });
await check("concurrent tick current-date-only single search key", async () => {
  const r = await Promise.all([
    req("/api/runner/tick"),
    req("/api/runner/tick"),
  ]);
  assert(r.every((x) => x.status === 200));
  const rows = JSON.parse(
    sql(
      `SELECT COALESCE(json_agg(json_build_object('key',dedupe_key,'date',input->>'referenceDate')),'[]') FROM tasks WHERE user_id='${id}';`,
    ),
  );
  assert.deepEqual(rows, [{ key: "search:" + today, date: today }]);
  assert.equal(ownNotifications().length, 1);
});
await check("deadline claim refreshes edited source URL", async () => {
  let s = (await req("/api/state", {}, true, "GET")).data;
  s.state.jobs[0].url = "https://example.com/revised";
  assert.equal(
    (
      await req(
        "/api/state",
        { expectedRevision: s.revision, state: s.state },
        true,
        "PUT",
      )
    ).status,
    200,
  );
  const n = (await req("/api/runner/notifications/claim")).data.notification;
  assert.equal(n.userId, id);
  assert.equal(n.payload.url, "https://example.com/revised");
});
// Reset only this synthetic user's delivery state, without external sending.
sql(`UPDATE notification_records SET status='pending' WHERE user_id='${id}';`);
await check(
  "submission after candidate creation cancels candidate",
  async () => {
    const s = (await req("/api/state", {}, true, "GET")).data;
    assert.equal(
      (
        await req(
          "/api/applications/a/submissions",
          { expectedRevision: s.revision, confirmedExternalSubmission: true },
          true,
        )
      ).status,
      201,
    );
    const n = (await req("/api/runner/notifications/claim")).data.notification;
    assert.equal(n, null);
    assert(ownNotifications().every((n) => n.status === "cancelled"));
  },
);
await check("past deadline and missed D-1 never replay", async () => {
  const past = {
    type: "deadline",
    applicationId: "past",
    company: "Past fixture",
    title: "Expired",
    url: "https://example.com/past",
    days: 1,
    timeUnknown: true,
  };
  sql(
    `INSERT INTO notification_records(user_id,key,status,payload) VALUES('${id}','deadline:past:${yesterday}:unknown:${yesterday}','pending',convert_from(decode('${Buffer.from(JSON.stringify(past)).toString("base64")}','base64'),'UTF8')::jsonb);`,
  );
  assert.equal(
    (await req("/api/runner/notifications/claim")).data.notification,
    null,
  );
  await req("/api/runner/tick");
  assert(ownNotifications().every((n) => n.status === "cancelled"));
});
await req("/api/runner/heartbeat", { capabilities: {} });
await req("/api/auth/logout", {}, true);
await fs.writeFile(
  "artifacts/qa/scheduler-results.json",
  JSON.stringify(
    { scope: "3001 isolated test DB; no Slack delivery called", results },
    null,
    2,
  ),
);
console.log(JSON.stringify(results, null, 2));
if (results.some((r) => !r.passed)) process.exitCode = 1;
