import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:5173/?fixture=1#onboarding");
  await page.locator("#on-skills").fill("직접입력기술, java");
  const skill = page.getByRole("group", {
    name: "주요 기술 선택 목록",
    exact: true,
  });
  await assert.equal(
    await skill
      .getByRole("button", { name: "Java", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await skill.getByRole("button", { name: "React", exact: true }).click();
  assert.equal(
    await page.locator("#on-skills").inputValue(),
    "직접입력기술, java, React",
  );
  await skill.getByRole("button", { name: "Java", exact: true }).click();
  assert.equal(
    await page.locator("#on-skills").inputValue(),
    "직접입력기술, React",
  );
  await page.locator("#on-region").fill("");
  await page
    .getByRole("group", { name: "희망 지역 선택 목록", exact: true })
    .getByRole("button", { name: "서울", exact: true })
    .click();
  assert.equal(await page.locator("#on-region").inputValue(), "서울");
  await page.locator("#on-exclusions").fill("");
  await page
    .getByRole("button", { name: "확인: 포괄임금제", exact: true })
    .click();
  assert.equal(
    await page.locator("#on-exclusions").inputValue(),
    "확인: 포괄임금제",
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  await fs.mkdir("artifacts/profile-options", { recursive: true });
  await page.screenshot({
    path: "artifacts/profile-options/onboarding-390.png",
    fullPage: true,
  });
  console.log(
    "PASS: suggestions, custom input preservation, case-insensitive toggle, region, condition, mobile overflow, no page errors",
  );
} finally {
  await browser.close();
}
