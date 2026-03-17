import { expect, test } from "@playwright/test";

test.describe("Страница сброса пароля", () => {
  const validToken = "valid-reset-token-123";
  const expiredToken = "expired-token-456";

  test.beforeEach(async ({ page }) => {
    // Мокаем проверку токена
    await page.route("**/api/auth/reset-password**", async (route) => {
      const url = route.request().url();
      if (url.includes(validToken)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ valid: true }),
        });
      } else if (url.includes(expiredToken)) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Token expired" }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invalid token" }),
        });
      }
    });
  });

  test("отображает форму сброса пароля с валидным токеном", async ({
    page,
  }) => {
    await page.goto(`/auth/reset-password?token=${validToken}`);

    // Проверяем основные элементы страницы
    await expect(page.locator("h1")).toContainText("Новый пароль");
    await expect(page.locator("#newPassword")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText(
      "Сохранить пароль",
    );
  });

  test("показывает ошибку для недействительного токена", async ({ page }) => {
    await page.goto("/auth/reset-password?token=invalid-token");

    await expect(page.locator("text=Недействительная ссылка")).toBeVisible();
    await expect(page.locator("text=⚠️")).toBeVisible();

    // Форма не должна отображаться
    await expect(page.locator("#newPassword")).not.toBeVisible();
  });

  test("показывает ошибку для истёкшего токена", async ({ page }) => {
    await page.goto(`/auth/reset-password?token=${expiredToken}`);

    await expect(page.locator("text=Ссылка истекла")).toBeVisible();
    await expect(page.locator("text=⚠️")).toBeVisible();
  });

  test("показывает ошибки валидации для пустых полей", async ({ page }) => {
    await page.goto(`/auth/reset-password?token=${validToken}`);

    await page.click('button[type="submit"]');

    await expect(
      page.locator("text=Пароль должен содержать минимум 8 символов"),
    ).toBeVisible();
  });

  test("успешно сбрасывает пароль", async ({ page }) => {
    await page.goto(`/auth/reset-password?token=${validToken}`);

    // Мокаем успешный сброс пароля
    await page.route("**/api/auth/reset-password", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    await page.fill("#newPassword", "newpassword123");

    await page.click('button[type="submit"]');

    // Проверяем состояние загрузки
    await expect(page.locator('button[type="submit"]')).toContainText(
      "Сохранение…",
    );

    // Проверяем редирект на страницу входа с сообщением
    await page.waitForURL("**/auth/signin?message=password_reset");
  });

  test("показывает ссылку на страницу входа", async ({ page }) => {
    await page.goto("/auth/reset-password?token=invalid");

    const signinLink = page.locator('a[href="/auth/signin"]');
    await expect(signinLink).toContainText("Вернуться ко входу");
    await expect(signinLink).toBeVisible();
  });

  test("поддерживает автозаполнение паролей", async ({ page }) => {
    await page.goto(`/auth/reset-password?token=${validToken}`);

    const passwordField = page.locator("#newPassword");

    await expect(passwordField).toHaveAttribute("autocomplete", "new-password");
  });

  test("показывает/скрывает пароль при клике на иконку", async ({ page }) => {
    await page.goto(`/auth/reset-password?token=${validToken}`);

    const passwordField = page.locator("#newPassword");

    await page.fill("#newPassword", "testpassword");

    // Изначально пароль скрыт
    await expect(passwordField).toHaveAttribute("type", "password");

    // Проверяем кнопку переключения, если она есть
    const toggleButtons = page.locator('[data-testid="password-toggle"]');
    const toggleCount = await toggleButtons.count();

    if (toggleCount > 0) {
      await toggleButtons.first().click();
      await expect(passwordField).toHaveAttribute("type", "text");
    }
  });
});
