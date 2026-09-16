import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
const base = "http://127.0.0.1:3001";
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const registered = await page.request.post(base + "/api/auth/register", {
    headers: { origin: base },
    data: {
      username: "snapshot-" + randomUUID().slice(0, 8),
      password: randomUUID() + "aA1!",
    },
  });
  assert.equal(registered.status(), 200);
  let s = await (await page.request.get(base + "/api/state")).json();
  s.state.jobs = [
    {
      id: "j",
      company: "합성회사",
      title: "합성직무",
      closeType: "unknown",
      url: "https://example.com/job",
    },
  ];
  s.state.apps = [
    {
      id: "a",
      jobId: "j",
      status: "preparing",
      profile: s.state.profile,
      questions: [
        {
          id: "q",
          title: "합성문항",
          prompt: "경험",
          text: "합성 첫 제출본",
          min: 0,
          max: 700,
          unit: "chars",
          spaces: true,
        },
      ],
      snapshots: [],
      stages: [
        {
          id: "stage",
          name: "합성면접",
          type: "interview",
          state: "준비",
          date: "",
          time: "",
        },
      ],
      qa: [],
    },
  ];
  s = await (
    await page.request.put(base + "/api/state", {
      headers: { origin: base },
      data: { expectedRevision: s.revision, state: s.state },
    })
  ).json();
  for (let i = 0; i < 2; i++)
    s = await (
      await page.request.post(base + "/api/applications/a/submissions", {
        headers: { origin: base },
        data: {
          expectedRevision: s.revision,
          confirmedExternalSubmission: true,
        },
      })
    ).json();
  const [older, newer] = s.state.apps[0].snapshots;
  let sent;
  await page.route("**/api/tasks", async (route) => {
    if (route.request().method() === "POST") {
      sent = route.request().postDataJSON();
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Fixture request capture only" }),
      });
    } else await route.continue();
  });
  await page.goto(base + "/#prep/a");
  await page.locator('[data-action="generate-questions"]').first().click();
  await page.getByLabel("확정 제출본", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("확정 제출본", { exact: true }).inputValue(),
    newer.id,
  );
  await page.getByLabel("확정 제출본", { exact: true }).selectOption(older.id);
  await page
    .getByRole("button", { name: "선택한 제출본으로 질문 생성", exact: true })
    .click();
  await page.waitForTimeout(700);
  assert.equal(sent.submissionId, older.id);
  assert.equal(sent.applicationId, "a");
  assert.deepEqual(errors, []);
  await fs.mkdir("artifacts/qa-ui", { recursive: true });
  await fs.writeFile(
    "artifacts/qa-ui/submission-selection.json",
    JSON.stringify({
      passed: true,
      latestDefault: true,
      olderIdSent: true,
      scope: "real3001 snapshots; POST captured without AI call",
      errors,
    }),
  );
  console.log("PASS: latest default, older snapshot ID sent, no page errors");
} finally {
  await browser.close();
}
