import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { blankState } from "../server/domain.mjs";
const base = "http://127.0.0.1:3001",
  id = randomUUID(),
  session = randomBytes(32).toString("hex"),
  task = randomUUID(),
  checks = [],
  errors = [];
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
const state = blankState("independent-ui");
state.onboardComplete = true;
state.jobs = [
  {
    id: "j",
    company: "독립 UI 합성 회사",
    title: "합성 직무",
    url: "https://example.org/synthetic",
    closeType: "unknown",
  },
];
state.experiences = [
  {
    id: "e1",
    title: "합성 경험 하나",
    kind: "프로젝트",
    role: "시험 역할",
    body: "실제 사용자 경험 아님",
    skills: "Java",
    confirmed: true,
  },
  {
    id: "e2",
    title: "합성 경험 둘",
    kind: "프로젝트",
    role: "시험 역할",
    body: "제외 보존 시험",
    skills: "SQL",
    confirmed: true,
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
        title: "보존 문항",
        prompt: "합성 문항입니다.",
        text: "서버의 최초 합성 입력",
        min: 0,
        max: 700,
        unit: "chars",
        spaces: true,
      },
      {
        id: "q2",
        title: "제외할 문항",
        prompt: "제외 시험입니다.",
        text: "제외 후에도 보존할 문항 원문",
        min: 0,
        max: 700,
        unit: "chars",
        spaces: true,
      },
    ],
    snapshots: [],
    stages: [],
    evidence: {},
    versions: [],
    qa: [],
  },
];
sql(
  `BEGIN; INSERT INTO users(id,username,password_hash) VALUES('${id}','final-ui-${id}','test-only-no-login'); INSERT INTO sessions(token_hash,user_id,expires_at) VALUES('${createHash("sha256").update(session).digest("hex")}','${id}',now()+interval '1 hour'); INSERT INTO user_state(user_id,data) VALUES('${id}',convert_from(decode('${Buffer.from(JSON.stringify(state)).toString("base64")}','base64'),'UTF8')::jsonb); INSERT INTO tasks(id,user_id,type,dedupe_key,input) VALUES('${task}','${id}','draft','final-ui-synthetic','{"applicationId":"a","questionId":"q","baseRevision":0}'); COMMIT;`,
);
const browser = await chromium.launch({ channel: "msedge", headless: true }),
  context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
await context.addCookies([
  {
    name: "junbisil_session",
    value: session,
    url: base,
    httpOnly: true,
    sameSite: "Strict",
  },
]);
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const dialog = () => page.getByRole("dialog"),
  read = async () => (await page.request.get(base + "/api/state")).json();
async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, passed: true });
  } catch (e) {
    checks.push({ name, passed: false, error: e.message.slice(0, 700) });
    await page.screenshot({
      path: "artifacts/qa/final-ui-failure-" + checks.length + ".png",
      fullPage: true,
    });
  }
}
async function settle() {
  await page.waitForTimeout(1000);
}
try {
  await page.goto(base + "/#write/a");
  await page.locator("#draft-editor").waitFor();
  await check("UI cancellation retains original draft", async () => {
    await page.getByRole("button", { name: "AI 작업 상태 보기" }).click();
    await dialog().getByRole("button", { name: "취소", exact: true }).click();
    await dialog()
      .getByRole("button", { name: "재시도", exact: true })
      .waitFor();
    assert.equal(
      sql(`SELECT status FROM tasks WHERE id='${task}' AND user_id='${id}';`),
      "cancelled",
    );
    await dialog().getByRole("button", { name: "닫기", exact: true }).click();
    assert.equal(
      await page.locator("#draft-editor").inputValue(),
      "서버의 최초 합성 입력",
    );
  });
  await check(
    "UI retry rejects before 60 seconds and queues after server timestamp ages",
    async () => {
      await page.getByRole("button", { name: "AI 작업 상태 보기" }).click();
      await dialog()
        .getByRole("button", { name: "재시도", exact: true })
        .click();
      await dialog().getByRole("alert").waitFor();
      assert.match(await dialog().getByRole("alert").innerText(), /60초/);
      assert.equal(
        sql(`SELECT status FROM tasks WHERE id='${task}' AND user_id='${id}';`),
        "cancelled",
      );
      sql(
        `UPDATE tasks SET finished_at=now()-interval '61 seconds' WHERE id='${task}' AND user_id='${id}';`,
      );
      await dialog()
        .getByRole("button", { name: "재시도", exact: true })
        .click();
      await dialog()
        .getByRole("button", { name: "취소", exact: true })
        .waitFor();
      assert.equal(
        sql(`SELECT status FROM tasks WHERE id='${task}' AND user_id='${id}';`),
        "queued",
      );
      await dialog().getByRole("button", { name: "취소", exact: true }).click();
      await dialog()
        .getByRole("button", { name: "재시도", exact: true })
        .waitFor();
      await dialog().getByRole("button", { name: "닫기", exact: true }).click();
    },
  );
  await check(
    "UI evidence deselection persists without removing experience",
    async () => {
      await page
        .locator('input[data-change="evidence"][data-key="e1"]')
        .uncheck();
      await settle();
      const s = (await read()).state;
      assert.equal(s.apps[0].evidence.e1, false);
      assert.equal(s.experiences.length, 2);
    },
  );
  await check("UI experience exclusion keeps original record", async () => {
    await page.evaluate(() => (location.hash = "experiences"));
    await page.locator('[data-action="edit-experience"][data-id="e2"]').click();
    await dialog()
      .getByRole("button", { name: "목록에서 제외", exact: true })
      .click();
    await dialog()
      .getByRole("button", { name: "목록에서 제외", exact: true })
      .click();
    await settle();
    assert.equal(
      await page
        .locator('[data-action="edit-experience"][data-id="e2"]')
        .count(),
      0,
    );
    assert.equal(
      await page
        .locator('[data-action="edit-experience"][data-id="e1"]')
        .count(),
      1,
    );
    const s = (await read()).state;
    assert.equal(s.experiences.find((e) => e.id === "e2").softDeleted, true);
    assert.equal(
      s.experiences.find((e) => e.id === "e2").body,
      "제외 보존 시험",
    );
  });
  await check(
    "UI question exclusion keeps draft text and remaining question usable",
    async () => {
      await page.evaluate(() => (location.hash = "write/a"));
      await page
        .locator('[data-action="select-question"][data-id="q2"]')
        .click();
      await page.locator('[data-action="edit-question"]').click();
      await dialog()
        .getByRole("button", { name: "문항 제외", exact: true })
        .click();
      await dialog()
        .getByRole("button", { name: "목록에서 제외", exact: true })
        .click();
      await settle();
      const s = (await read()).state;
      assert.equal(
        s.apps[0].questions.find((q) => q.id === "q2").softDeleted,
        true,
      );
      assert.equal(
        s.apps[0].questions.find((q) => q.id === "q2").text,
        "제외 후에도 보존할 문항 원문",
      );
      assert.equal(
        await page
          .locator('[data-action="select-question"][data-id="q2"]')
          .count(),
        0,
      );
      assert.equal(
        await page.locator("#draft-editor").inputValue(),
        "서버의 최초 합성 입력",
      );
    },
  );
  await check(
    "real 409 revision conflict preserves unsaved text through navigation and stops overwrite",
    async () => {
      const s = await read();
      s.state.apps[0].questions[0].text = "별도 창에서 저장한 합성 글";
      const r = await page.request.put(base + "/api/state", {
        headers: { origin: base },
        data: { expectedRevision: s.revision, state: s.state },
      });
      assert.equal(r.status(), 200);
      const conflict = page.waitForResponse(
        (r) =>
          r.url() === base + "/api/state" &&
          r.request().method() === "PUT" &&
          r.status() === 409,
      );
      await page
        .locator("#draft-editor")
        .fill("충돌 시 보존해야 하는 미저장 합성 입력");
      await conflict;
      await settle();
      assert.equal(
        await page.locator("#draft-editor").inputValue(),
        "충돌 시 보존해야 하는 미저장 합성 입력",
      );
      assert.match(
        await page.locator("body").innerText(),
        /다른 창에서 자료가 변경/,
      );
      await page.evaluate(() => (location.hash = "home"));
      await settle();
      await page.evaluate(() => (location.hash = "write/a"));
      await page.locator("#draft-editor").waitFor();
      assert.equal(
        await page.locator("#draft-editor").inputValue(),
        "충돌 시 보존해야 하는 미저장 합성 입력",
      );
      assert.equal(
        (await read()).state.apps[0].questions[0].text,
        "별도 창에서 저장한 합성 글",
      );
      await page.screenshot({
        path: "artifacts/qa/final-ui-conflict.png",
        fullPage: true,
      });
    },
  );
} finally {
  await page.request.post(base + "/api/auth/logout", {
    headers: { origin: base },
  });
  await browser.close();
  await fs.writeFile(
    "artifacts/qa/final-ui-results.json",
    JSON.stringify(
      {
        scope:
          "isolated 3001 synthetic DB/API/browser only; no AI or Slack; retry clock aged via own fixture SQL, no wall-clock 60s wait",
        checks,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ checks, errors }, null, 2));
  if (checks.some((c) => !c.passed) || errors.length) process.exitCode = 1;
}
