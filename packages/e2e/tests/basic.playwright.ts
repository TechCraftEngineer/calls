import { expect, test } from "@playwright/test";

// @bun-test-skip - Playwright test
test("basic page load test", async ({ page }) => {
  await page.goto("/auth/signin");
  await expect(page).toHaveTitle(/QBS|Звонки|Вход|Авторизация/);
  console.log("Page title:", await page.title());
  console.log("Page URL:", page.url());
});
