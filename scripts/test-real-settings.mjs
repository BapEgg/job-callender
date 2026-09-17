import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let phase = "signup";
const checks = [];
try {
  await page.goto("http://127.0.0.1:3001/#signup");
  await page.locator("#auth-id").fill("settings-ui-" + Date.now());
  await page
    .locator("#auth-password")
    .fill(crypto.randomBytes(24).toString("hex"));
  await page.getByRole("button", { name: "계정 만들기", exact: true }).click();
  await page.waitForURL("**/#onboarding");
  phase = "role-save";
  await page.locator("#on-role").fill("직접입력직무");
  await page.locator("#on-role").locator("..").locator("summary").click();
  await page
    .getByRole("button", { name: "백엔드 개발자", exact: true })
    .click();
  await page.locator("#on-region").locator("..").locator("summary").click();
  await page
    .getByRole("group", { name: "희망 지역 선택 목록", exact: true })
    .getByRole("button", { name: "서울", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 900 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "artifacts/qa-ui/real-profile-region-390.png",
    fullPage: true,
  });
  await page.locator('[data-action="onboard-next"]').click();
  await page.waitForTimeout(1200);
  const state = await (
    await page.request.get("http://127.0.0.1:3001/api/state")
  ).json();
  assert.equal(state.state.profile.role, "직접입력직무, 백엔드 개발자");
  assert.equal(state.state.profile.region, "서울");
  checks.push(
    "role custom input and selection saved; region selected; mobile overflow absent",
  );
  await page.evaluate(() => (location.hash = "data"));
  await page.locator("#profile-role").waitFor();
  await page.reload();
  assert.equal(
    await page.locator("#profile-role").inputValue(),
    "직접입력직무, 백엔드 개발자",
  );
  checks.push("profile role persisted after reload");
  phase = "settings";
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => (location.hash = "settings"));
  await page.getByText("개인 실행기와 AI", { exact: true }).waitFor();
  const apiState = await (
    await page.request.get("http://127.0.0.1:3001/api/connections")
  ).json();
  assert.equal(apiState.slack, "unconfigured");
  await page.getByText("Webhook 설정 필요", { exact: true }).waitFor();
  assert(!/시연/.test(await page.locator("main").innerText()));
  await page.screenshot({
    path: "artifacts/qa-ui/real-settings-1440.png",
    fullPage: true,
  });
  checks.push(
    "actual connection panel has no demonstration copy; Slack unconfigured maps to setup needed",
  );
  await page.getByRole("tab", { name: "공고 자동 갱신", exact: true }).click();
  assert(!/시연|모의/.test(await page.locator("main").innerText()));
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/connections") && r.request().method() === "GET",
  );
  await page
    .getByRole("button", { name: "연결 상태 다시 확인", exact: true })
    .click();
  assert.equal((await response).status(), 200);
  await page
    .getByText("서버에서 현재 연결 상태를 다시 확인했습니다.", { exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 900 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "artifacts/qa-ui/real-settings-batch-390.png",
    fullPage: true,
  });
  checks.push(
    "batch has no simulation controls; refresh makes actual GET; mobile overflow absent",
  );
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    environment: "isolated actual PostgreSQL test3001",
    checks,
    pageErrors: errors,
    slack: apiState.slack,
  };
  await fs.writeFile(
    "artifacts/qa-ui/real-settings-result.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (error) {
  console.log(
    JSON.stringify({
      passed: false,
      phase,
      error: String(error),
      checks,
      errors,
    }),
  );
  await page.screenshot({
    path: "artifacts/qa-ui/real-settings-failure.png",
    fullPage: true,
  });
  process.exitCode = 1;
} finally {
  await browser.close();
}
