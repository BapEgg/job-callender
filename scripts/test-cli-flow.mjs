import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
if (!process.env.JOBPREP_CODEX_EXE)
  throw Error("Set JOBPREP_CODEX_EXE to the verified host executable.");
await fs.mkdir("artifacts/automation", { recursive: true });
const base = "http://127.0.0.1:3001";
const token = (await fs.readFile(".env", "utf8"))
  .match(/^RUNNER_TOKEN=(.+)$/m)[1]
  .trim();
let cookie = "";
async function api(
  route,
  data,
  runner = false,
  method = data ? "POST" : "GET",
) {
  const r = await fetch(base + route, {
    method,
    headers: {
      origin: base,
      "content-type": "application/json",
      ...(runner ? { authorization: "Bearer " + token } : { cookie }),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const v = await r.json();
  assert(r.ok, `${route}: ${r.status} ${v.error || ""}`);
  if (r.headers.get("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  return v;
}
async function once() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["runner/main.mjs", "--once"], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        JOBPREP_URL: base,
        JOBPREP_CODEX_VERIFIED: "true",
        JOBPREP_SEARCH_VERIFIED: "false",
        JOBPREP_SLACK_APPROVED: "false",
      },
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(Error("runner exit " + code)),
    );
  });
}
const results = [];
try {
  await api("/api/auth/register", {
    username: "cli-fixture-" + randomUUID().slice(0, 8),
    password: randomUUID() + "aA1!",
  });
  let s = await api("/api/state");
  s.state.profile.summary = "Synthetic test evidence only, not user history.";
  s.state.jobs = [
    {
      id: "j",
      company: "Synthetic fixture company",
      title: "Test developer",
      closeType: "unknown",
      url: "https://example.com/fixture",
    },
  ];
  s.state.experiences = [
    {
      id: "e",
      title: "Synthetic todo exercise",
      confirmed: true,
      role: "Implemented a local todo exercise",
      action: "Added input validation and checked blank input manually",
      result:
        "Blank input was rejected in the local exercise; no production metrics",
    },
  ];
  s.state.apps = [
    {
      id: "a",
      jobId: "j",
      status: "preparing",
      profile: structuredClone(s.state.profile),
      questions: [
        {
          id: "q",
          title: "테스트 문항",
          prompt:
            "확인된 연습 경험을 한국어 150자 이내로 작성하세요. 허구의 운영 성과를 추가하지 마세요.",
          text: "기존 사용자 초안 보존 시험",
          min: 0,
          max: 150,
          unit: "chars",
          spaces: true,
        },
      ],
      snapshots: [],
      stages: [],
      evidence: { e: true },
    },
  ];
  s = await api(
    "/api/state",
    { expectedRevision: s.revision, state: s.state },
    false,
    "PUT",
  );
  await api(
    "/api/runner/heartbeat",
    { capabilities: { draft: true, questions: true, search: false } },
    true,
  );
  await api("/api/tasks", {
    type: "draft",
    applicationId: "a",
    questionId: "q",
  });
  await once();
  let task = (await api("/api/tasks")).tasks.find((t) => t.type === "draft");
  assert.equal(task.status, "succeeded", task.error_code);
  assert(task.result.text.length);
  s = await api("/api/tasks/" + task.id + "/apply", {
    expectedRevision: s.revision,
  });
  assert.equal(s.state.apps[0].versions[0].text, "기존 사용자 초안 보존 시험");
  results.push({
    phase: "real Codex draft through queued runner and guarded apply",
    passed: true,
    codepoints: [...task.result.text].length,
  });
  s = await api("/api/applications/a/submissions", {
    expectedRevision: s.revision,
    confirmedExternalSubmission: true,
  });
  const snapshot = s.state.apps[0].snapshots[0];
  await api("/api/tasks", {
    type: "questions",
    applicationId: "a",
    submissionId: snapshot.id,
  });
  await once();
  task = (await api("/api/tasks")).tasks.find((t) => t.type === "questions");
  assert.equal(task.status, "succeeded", task.error_code);
  assert(task.result.questions.length);
  s = await api("/api/tasks/" + task.id + "/apply", {
    expectedRevision: s.revision,
  });
  assert(s.state.apps[0].qa.every((q) => q.submissionId === snapshot.id));
  assert.deepEqual(s.state.apps[0].snapshots[0], snapshot);
  results.push({
    phase: "confirmed synthetic submission to actual Codex questions",
    passed: true,
    questions: s.state.apps[0].qa.length,
    snapshotPreserved: true,
  });
} catch (e) {
  results.push({ passed: false, error: e.message });
  process.exitCode = 1;
} finally {
  await api("/api/runner/heartbeat", { capabilities: {} }, true);
  await fs.writeFile(
    "artifacts/automation/cli-api-flow.json",
    JSON.stringify(
      {
        scope:
          "synthetic isolated3001; external submission acknowledgement is a test, no actual job application",
        results,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results));
}
