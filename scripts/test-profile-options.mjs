import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:5173/?fixture=1#onboarding");
  await page.locator("#on-skills").locator("..").locator("summary").click();
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
  await page.locator("#on-region").locator("..").locator("summary").click();
  await page.locator("#on-region").fill("");
  await page
    .getByRole("group", { name: "희망 지역 선택 목록", exact: true })
    .getByRole("button", { name: "서울", exact: true })
    .click();
  assert.equal(await page.locator("#on-region").inputValue(), "서울");
  await page.locator("#on-exclusions").locator("..").locator("summary").click();
  await page.locator("#on-exclusions").fill("");
  await page
    .getByRole("button", { name: "포괄임금제", exact: true })
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
  await page.locator('#on-role').fill('직접입력직무');
  await page.locator('#on-role').locator('..').locator('summary').click();
  await page.getByRole('button',{name:'백엔드 개발자',exact:true}).click();
  assert.equal(await page.locator('#on-role').inputValue(),'직접입력직무, 백엔드 개발자');
  assert.equal(await page.getByRole('button',{name:'확인: 포괄임금제',exact:true}).count(),0);
  assert.deepEqual(errors, []);
  await fs.mkdir("artifacts/profile-options", { recursive: true });
  await page.screenshot({
    path: "artifacts/profile-options/onboarding-390.png",
    fullPage: true,
  });
  await page.locator('details[open] summary').evaluateAll(nodes => nodes.forEach(n => n.click()));
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({path:'artifacts/profile-options/onboarding-1440.png',fullPage:true});
  await page.evaluate(()=>location.hash='data');
  await page.locator('#profile-role').waitFor();
  assert(await page.locator('#profile-role').locator('..').locator('summary').isVisible());
  await page.screenshot({path:'artifacts/profile-options/data-1440.png',fullPage:true});
  await page.setViewportSize({width:390,height:900});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'artifacts/profile-options/data-390.png',fullPage:true});
  console.log(
    "PASS: suggestions, custom input preservation, case-insensitive toggle, region, condition, mobile overflow, no page errors",
  );
} finally {
  await browser.close();
}
