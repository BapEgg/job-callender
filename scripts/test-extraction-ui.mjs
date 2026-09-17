import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const checks = [];
let phase = "signup";
const dialog = () => page.getByRole("dialog");
const state = async () =>
  (await page.request.get("http://127.0.0.1:3001/api/state")).json();
const settle = () => page.waitForTimeout(1100);
const save = async () => {
  await dialog().getByRole("button", { name: "저장", exact: true }).click();
  await settle();
};
try {
  await fs.mkdir("artifacts/qa-ui", { recursive: true });
  await page.goto("http://127.0.0.1:3001/#signup");
  await page.locator("#auth-id").fill("extract-ui-" + Date.now());
  await page
    .locator("#auth-password")
    .fill(crypto.randomBytes(24).toString("hex"));
  await page.getByRole("button", { name: "계정 만들기", exact: true }).click();
  await page.waitForURL("**/#onboarding");
  await page.evaluate(() => (location.hash = "data"));
  await page
    .getByRole("tab", { name: "등록한 원본 자료", exact: true })
    .click();
  phase = "upload";
  await page.locator('[data-action="add-source"]').click();
  await page
    .getByLabel("자료 이름", { exact: true })
    .fill("합성 TXT 추출 시험");
  const original = Buffer.from(
    "Synthetic local extraction test.\nI verified a small sample; production scale was not tested.",
    "utf8",
  );
  await page
    .locator("#source-file")
    .setInputFiles({
      name: "synthetic-extraction.txt",
      mimeType: "text/plain",
      buffer: original,
    });
  await save();
  const before = (await state()).state.sources[0];
  assert(before.fileId);
  assert.deepEqual(
    await (await page.request.get("http://127.0.0.1:3001" + before.url)).body(),
    original,
  );
  checks.push("synthetic TXT upload and authenticated original byte equality");
  phase = "extract";
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/extract") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "내용 추출", exact: true }).click();
  await page
    .getByLabel("저장할 원본 내용", { exact: true })
    .fill("직접 적은 검토 내용");
  const extraction = (await (await response).json()).extraction;
  assert.equal(extraction.status, "ready");
  await page
    .getByRole("button", { name: "추출 결과를 입력 끝에 추가", exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("저장할 원본 내용", { exact: true }).inputValue(),
    "직접 적은 검토 내용",
  );
  await page
    .getByRole("button", { name: "추출 결과를 입력 끝에 추가", exact: true })
    .click();
  const expected = "직접 적은 검토 내용\n\n" + extraction.text;
  assert.equal(
    await page.getByLabel("저장할 원본 내용", { exact: true }).inputValue(),
    expected,
  );
  assert.equal((await state()).state.sources[0].extractedText, undefined);
  checks.push(
    "extraction does not overwrite typed input or save automatically; explicit append preserves input",
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "artifacts/qa-ui/extraction-1440.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 900 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "artifacts/qa-ui/extraction-390.png",
    fullPage: true,
  });
  await save();
  await page.reload();
  await page
    .getByRole("tab", { name: "등록한 원본 자료", exact: true })
    .click();
  assert.equal((await state()).state.sources[0].extractedText, expected);
  checks.push("explicit extracted text save persists across reload");
  phase = "experience";
  await page
    .getByRole("button", { name: "내용으로 경험 추가", exact: true })
    .click();
  assert.equal(
    await page
      .getByLabel("내가 수행한 범위를 확인했습니다.", { exact: true })
      .isChecked(),
    false,
  );
  assert.equal(
    await page.getByLabel("확인한 내용과 한계", { exact: true }).inputValue(),
    expected,
  );
  assert.equal((await state()).state.experiences.length, 0);
  await save();
  let current = (await state()).state;
  assert.equal(current.experiences[0].confirmed, false);
  assert.equal(current.experiences[0].sourceId, before.id);
  checks.push(
    "experience creation starts unconfirmed and requires explicit save",
  );
  await page.evaluate(() => (location.hash = "experiences"));
  await page
    .locator(
      '[data-action="edit-experience"][data-id="' +
        current.experiences[0].id +
        '"]',
    )
    .click();
  await page
    .getByLabel("본인 역할", { exact: true })
    .fill("합성 시험: 작은 표본을 직접 검증");
  await page
    .getByLabel("내가 수행한 범위를 확인했습니다.", { exact: true })
    .check();
  await save();
  current = (await state()).state;
  assert.equal(current.experiences[0].confirmed, true);
  assert.equal(current.experiences[0].role, "합성 시험: 작은 표본을 직접 검증");
  assert.equal(current.sources[0].fileId, before.fileId);
  assert.equal(current.sources[0].sha256, before.sha256);
  assert.deepEqual(
    await (await page.request.get("http://127.0.0.1:3001" + before.url)).body(),
    original,
  );
  assert.deepEqual(errors, []);
  checks.push(
    "role and explicit user confirmation saved; original file unchanged; no page errors or overflow",
  );
  const result = {
    passed: true,
    environment: "real isolated PostgreSQL test3001",
    checks,
    pageErrors: errors,
  };
  await fs.writeFile(
    "artifacts/qa-ui/extraction-result.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} catch (error) {
  console.log(
    JSON.stringify({
      passed: false,
      phase,
      error: String(error),
      checks,
      pageErrors: errors,
    }),
  );
  await page.screenshot({
    path: "artifacts/qa-ui/extraction-failure.png",
    fullPage: true,
  });
  process.exitCode = 1;
} finally {
  await browser.close();
}
