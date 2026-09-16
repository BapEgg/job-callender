// Runs only against the isolated compose.test.yaml database on port 3001.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { blankState } from "../server/domain.mjs";
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
  cookie = "junbisil_session=" + session,
  state = blankState("task-qa");
state.jobs = [
  {
    id: "j",
    company: "QA fixture",
    title: "QA",
    url: "https://example.com/qa",
    closeType: "unknown",
  },
];
state.experiences = [
  { id: "include", confirmed: true },
  { id: "unchecked", confirmed: true },
  { id: "deleted", confirmed: true, softDeleted: true },
  { id: "unconfirmed", confirmed: false },
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
        text: "Before generation",
        min: 0,
        max: 700,
        unit: "chars",
        spaces: true,
      },
      {
        id: "hidden",
        title: "Hidden",
        prompt: "Hidden",
        text: "",
        min: 0,
        max: 700,
        unit: "chars",
        spaces: true,
        softDeleted: true,
      },
    ],
    snapshots: [],
    stages: [],
    evidence: { unchecked: false },
    versions: [{ id: "seed", questionId: "q", text: "Earlier version" }],
  },
];
sql(
  `BEGIN; INSERT INTO users(id,username,password_hash) VALUES('${id}','task-${id}','test-only-no-login'); INSERT INTO sessions(token_hash,user_id,expires_at) VALUES('${createHash("sha256").update(session).digest("hex")}','${id}',now()+interval '1 hour'); INSERT INTO user_state(user_id,data) VALUES('${id}',convert_from(decode('${Buffer.from(JSON.stringify(state)).toString("base64")}','base64'),'UTF8')::jsonb); COMMIT;`,
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
await req("/api/runner/heartbeat", { capabilities: { draft: true } });
let taskId,
  attempt = randomUUID();
await check(
  "only confirmed selected nondeleted experiences enter draft input",
  async () => {
    const created = await req(
      "/api/tasks",
      { type: "draft", applicationId: "a", questionId: "q" },
      true,
    );
    assert.equal(created.status, 202);
    taskId = created.data.task.id;
    const tasks = (await req("/api/tasks", {}, true, "GET")).data.tasks;
    assert.deepEqual(
      tasks.find((t) => t.id === taskId).input.experiences.map((e) => e.id),
      ["include"],
    );
    assert.equal(
      (
        await req(
          "/api/tasks",
          { type: "draft", applicationId: "a", questionId: "hidden" },
          true,
        )
      ).status,
      404,
    );
  },
);
if (taskId) {
  assert.match(taskId, /^[a-f0-9-]{36}$/);
  sql(
    `UPDATE tasks SET status='running',attempt=1,attempt_token='${attempt}',lease_until=now()+interval '30 seconds' WHERE id='${taskId}' AND user_id='${id}';`,
  );
}
await check(
  "heartbeat rejects wrong token and extends live lease",
  async () => {
    assert.equal(
      (
        await req(`/api/runner/tasks/${taskId}/heartbeat`, {
          attemptToken: randomUUID(),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await req(`/api/runner/tasks/${taskId}/heartbeat`, {
          attemptToken: attempt,
        })
      ).status,
      200,
    );
    assert.equal(
      sql(
        `SELECT (lease_until>now()+interval '4 minutes') FROM tasks WHERE id='${taskId}' AND user_id='${id}';`,
      ),
      "t",
    );
  },
);
await check("expired heartbeat cannot resurrect lease", async () => {
  sql(
    `UPDATE tasks SET lease_until=now()-interval '1 second' WHERE id='${taskId}' AND user_id='${id}';`,
  );
  assert.equal(
    (
      await req(`/api/runner/tasks/${taskId}/heartbeat`, {
        attemptToken: attempt,
      })
    ).status,
    409,
  );
});
// Begin a new synthetic attempt directly in isolated DB to test apply independently.
attempt = randomUUID();
if (taskId)
  sql(
    `UPDATE tasks SET attempt=2,attempt_token='${attempt}',lease_until=now()+interval '5 minutes' WHERE id='${taskId}' AND user_id='${id}';`,
  );
await check(
  "draft apply preserves prior version and rejects duplicate application",
  async () => {
    assert.equal(
      (
        await req(`/api/runner/tasks/${taskId}/complete`, {
          attemptToken: attempt,
          result: { text: "Generated fixture only" },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await req(`/api/runner/tasks/${taskId}/heartbeat`, {
          attemptToken: attempt,
        })
      ).status,
      409,
    );
    let s = (await req("/api/state", {}, true, "GET")).data;
    assert.equal(s.state.apps[0].questions[0].text, "Before generation");
    const applied = await req(
      `/api/tasks/${taskId}/apply`,
      { expectedRevision: s.revision },
      true,
    );
    assert.equal(applied.status, 200);
    const app = applied.data.state.apps[0];
    assert.equal(app.questions[0].text, "Generated fixture only");
    assert.equal(app.versions.length, 2);
    assert.equal(app.versions[0].text, "Earlier version");
    assert.equal(app.versions[1].text, "Before generation");
    assert.equal(app.versions[1].questionId, "q");
    assert.equal(app.versions[1].taskId, taskId);
    assert.equal(
      (
        await req(
          `/api/tasks/${taskId}/apply`,
          { expectedRevision: applied.data.revision },
          true,
        )
      ).status,
      409,
    );
  },
);
await check("cancelled task heartbeat cannot extend lease", async () => {
  const t = (
    await req(
      "/api/tasks",
      { type: "draft", applicationId: "a", questionId: "q" },
      true,
    )
  ).data.task;
  assert.match(t.id, /^[a-f0-9-]{36}$/);
  const a = randomUUID();
  sql(
    `UPDATE tasks SET status='running',attempt=1,attempt_token='${a}',lease_until=now()+interval '5 minutes' WHERE id='${t.id}' AND user_id='${id}';`,
  );
  assert.equal((await req(`/api/tasks/${t.id}/cancel`, {}, true)).status, 200);
  assert.equal(
    (await req(`/api/runner/tasks/${t.id}/heartbeat`, { attemptToken: a }))
      .status,
    409,
  );
});
await req("/api/runner/heartbeat", { capabilities: {} });
await req("/api/auth/logout", {}, true);
await fs.writeFile(
  "artifacts/qa/task-revisions-results.json",
  JSON.stringify(
    { scope: "3001 testdb synthetic records only; no AI/Slack calls", results },
    null,
    2,
  ),
);
console.log(JSON.stringify(results, null, 2));
if (results.some((r) => !r.passed)) process.exitCode = 1;
