import { chromium } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
const errors = [];
let phase = "signup";
page.on("pageerror", (e) => errors.push(e.message));
const user = "ui-smoke-" + Date.now();
const password = crypto.randomBytes(24).toString("hex");
try {
  await page.goto("http://127.0.0.1:3001/#signup");
  await page.locator("#auth-id").fill(user);
  await page.locator("#auth-password").fill(password);
  await page.getByRole("button", { name: "계정 만들기", exact: true }).click();
  await page.waitForURL("**/#onboarding");
  phase = "home";
  await page.evaluate(() => (location.hash = "home"));
  await page
    .getByRole("heading", { name: "오늘의 준비", exact: true })
    .waitFor();
  if ((await page.locator("body").innerText()).includes("모노페이"))
    throw Error("Fixture leaked");
  phase = "job";
  await page.locator('.sidebar [data-val="jobs"]').click();
  await page
    .getByRole("button", { name: "공고 링크 등록", exact: true })
    .click();
  await page.getByLabel("채용 원문 URL").fill("https://example.org/test-job");
  await page.getByLabel("회사 이름").fill("격리UI시험회사");
  await page.getByLabel("직무 이름").fill("검증개발");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "저장", exact: true })
    .click();
  await page.locator('[data-action="start-application"]').click();
  await page.waitForTimeout(1000);
  const data = await (
    await page.request.get("http://127.0.0.1:3001/api/state")
  ).json();
  const id = data.state.apps[0]?.id;
  if (!id) throw Error("Application missing");
  phase = "question";
  await page.evaluate((id) => (location.hash = "write/" + id), id);
  await page
    .getByRole("button", { name: "문항 추가", exact: true })
    .first()
    .click();
  await page.getByLabel("문항 이름").fill("검증 문항");
  await page.getByLabel("문항 원문").fill("직접 확인한 경험을 작성해 주세요.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "저장", exact: true })
    .click();
  await page
    .locator("#draft-editor")
    .fill("직접 수행한 사실과 검증한 한계를 기록합니다.");
  await page.waitForTimeout(1000);
  phase = "reload";
  await page.reload();
  await page.locator("#draft-editor").waitFor();
  if (
    (await page.locator("#draft-editor").inputValue()) !==
    "직접 수행한 사실과 검증한 한계를 기록합니다."
  )
    throw Error("Draft lost");
  phase = "submit";
  await page.evaluate((id) => (location.hash = "submission/" + id), id);
  await page.locator('[data-action="confirm-submit"]').click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("button", { name: "제출본 확정", exact: true }).click();
  await page.waitForTimeout(900);
  const result = await (
    await page.request.get("http://127.0.0.1:3001/api/state")
  ).json();
  if (result.state.apps[0].snapshots.length !== 1)
    throw Error("Snapshot missing");
  phase = "finished";
  await fs.mkdir("artifacts/qa-ui", { recursive: true });
  await page.screenshot({
    path: "artifacts/qa-ui/real-test-submission.png",
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      passed: true,
      mode: "real isolated Compose PostgreSQL test3001",
      errors,
      jobs: result.state.jobs.length,
      applications: result.state.apps.length,
      questions: result.state.apps[0].questions.length,
      snapshots: result.state.apps[0].snapshots.length,
      revision: result.revision,
    }),
  );
} catch (error) {
  console.log(
    JSON.stringify({ passed: false, phase, errors, error: String(error) }),
  );
  await fs.mkdir("artifacts/qa-ui", { recursive: true });
  await page.screenshot({
    path: "artifacts/qa-ui/real-test-failure.png",
    fullPage: true,
  });
  process.exitCode = 1;
} finally {
  await browser.close();
}
