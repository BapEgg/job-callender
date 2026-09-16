import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
const base = "http://127.0.0.1:3001",
  results = [];
async function request(
  route,
  { method = "GET", data, cookie = "", origin = base } = {},
) {
  const res = await fetch(base + route, {
    method,
    headers: {
      ...(data ? { "content-type": "application/json" } : {}),
      cookie,
      origin,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const value = await res.json();
  return {
    status: res.status,
    data: value,
    cookie: res.headers.get("set-cookie")?.split(";")[0],
  };
}
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({ name, passed: false, error: e.message });
  }
}
const suffix = randomUUID().slice(0, 8),
  password = randomUUID() + "aA1!";
let a, b, state, revision;
await check("unauthenticated access blocked", async () => {
  assert.equal((await request("/api/state")).status, 401);
  assert.equal(
    (await request("/api/runner/claim", { method: "POST", data: {} })).status,
    401,
  );
});
await check("register hashed credential and session", async () => {
  a = await request("/api/auth/register", {
    method: "POST",
    data: { username: "fixture-a-" + suffix, password },
  });
  assert.equal(a.status, 200);
  assert.match(a.cookie, /junbisil_session=/);
  assert.equal(
    (await request("/api/auth/me", { cookie: a.cookie })).data.user.username,
    "fixture-a-" + suffix,
  );
  b = await request("/api/auth/register", {
    method: "POST",
    data: { username: "fixture-b-" + suffix, password },
  });
  assert.equal(b.status, 200);
});
await check("foreign Origin mutation blocked", async () => {
  assert.equal(
    (
      await request("/api/state", {
        method: "PUT",
        cookie: a.cookie,
        origin: "https://evil.example",
        data: {},
      })
    ).status,
    403,
  );
});
await check("durable owner state and optimistic conflict", async () => {
  const s = await request("/api/state", { cookie: a.cookie });
  state = s.data.state;
  revision = s.data.revision;
  state.profile.summary = "Confirmed fixture experience";
  state.jobs.push({
    id: "job-fixture",
    company: "Fixture company",
    title: "Fixture role",
    closeType: "unknown",
    manualURL: "https://example.com/jobs/fixture",
  });
  state.apps.push({
    id: "app-fixture",
    jobId: "job-fixture",
    status: "preparing",
    profile: structuredClone(state.profile),
    questions: [
      {
        id: "q1",
        title: "fixture",
        prompt: "Describe a confirmed experience",
        text: "Fixture answer",
        min: 1,
        max: 700,
        spaces: true,
        unit: "chars",
      },
    ],
    snapshots: [],
    stages: [],
  });
  const body = { expectedRevision: revision, state };
  const [one, two] = await Promise.all([
    request("/api/state", { method: "PUT", cookie: a.cookie, data: body }),
    request("/api/state", { method: "PUT", cookie: a.cookie, data: body }),
  ]);
  assert.deepEqual([one.status, two.status].sort(), [200, 409]);
  const saved = await request("/api/state", { cookie: a.cookie });
  state = saved.data.state;
  revision = saved.data.revision;
  assert.equal(state.profile.summary, "Confirmed fixture experience");
  assert.equal(
    (await request("/api/state", { cookie: b.cookie })).data.state.apps.length,
    0,
  );
});
await check(
  "submission explicit confirmation and owner isolation",
  async () => {
    assert.equal(
      (
        await request("/api/applications/app-fixture/submissions", {
          method: "POST",
          cookie: b.cookie,
          data: { expectedRevision: 0, confirmedExternalSubmission: true },
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request("/api/applications/app-fixture/submissions", {
          method: "POST",
          cookie: a.cookie,
          data: { expectedRevision: revision },
        })
      ).status,
      400,
    );
    const r = await request("/api/applications/app-fixture/submissions", {
      method: "POST",
      cookie: a.cookie,
      data: { expectedRevision: revision, confirmedExternalSubmission: true },
    });
    assert.equal(r.status, 201);
    state = r.data.state;
    revision = r.data.revision;
    assert.equal(
      state.apps[0].snapshots[0].questions[0].text,
      "Fixture answer",
    );
  },
);
await check(
  "profile changes preserve submission and forged snapshots rejected",
  async () => {
    state.profile.summary = "changed baseline";
    state.apps[0].questions[0].text = "edited draft";
    let r = await request("/api/state", {
      method: "PUT",
      cookie: a.cookie,
      data: { state, expectedRevision: revision },
    });
    assert.equal(r.status, 200);
    state = r.data.state;
    revision = r.data.revision;
    assert.equal(
      state.apps[0].snapshots[0].questions[0].text,
      "Fixture answer",
    );
    const forged = structuredClone(state);
    forged.apps[0].snapshots[0].questions[0].text = "forged";
    assert.equal(
      (
        await request("/api/state", {
          method: "PUT",
          cookie: a.cookie,
          data: { state: forged, expectedRevision: revision },
        })
      ).status,
      409,
    );
  },
);
await check("missing runner never generates mock success", async () => {
  assert.equal(
    (
      await request("/api/tasks", {
        method: "POST",
        cookie: a.cookie,
        data: { type: "search" },
      })
    ).status,
    503,
  );
});
await check("file content persists with owner isolation", async () => {
  const r = await request("/api/files", {
    method: "POST",
    cookie: a.cookie,
    data: {
      name: "fixture.txt",
      base64: Buffer.from("fixture file, no personal data").toString("base64"),
    },
  });
  assert.equal(r.status, 201);
  const file = r.data.file;
  assert.equal((await request(file.url, { cookie: b.cookie })).status, 404);
  const own = await fetch(base + file.url, { headers: { cookie: a.cookie } });
  assert.equal(await own.text(), "fixture file, no personal data");
});
await check("logout invalidates stored session", async () => {
  assert.equal(
    (
      await request("/api/auth/logout", {
        method: "POST",
        cookie: a.cookie,
        data: {},
      })
    ).status,
    200,
  );
  assert.equal((await request("/api/state", { cookie: a.cookie })).status, 401);
});
await fs.mkdir("artifacts/api", { recursive: true });
await fs.writeFile(
  "artifacts/api/results.json",
  JSON.stringify(
    {
      results,
      scope: "isolated job-callender-test DB; synthetic fixtures only",
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results, null, 2));
if (results.some((r) => !r.passed)) process.exitCode = 1;
