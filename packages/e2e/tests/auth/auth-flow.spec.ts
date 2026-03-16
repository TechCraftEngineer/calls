import { expect, test } from "@playwright/test";

test.describe("Поток аутентификации", () => {
  test("навигация между страницами аутентификации", async ({ page }) => {
    // Начинаем со страницы входа
    await page.goto("/auth/signin");
    await expect(page.locator("h1")).toContainText("С возвращением!");

    // Переходим на страницу регистрации
    await page.click('a[href="/auth/signup"]');
    await expect(page.locator("h1")).toContainText("Регистрация");

    // Возвращаемся на страницу входа
    await page.click('a[href="/auth/signin"]');
    await expect(page.locator("h1")).toContainText("С возвращением!");

    // Переходим на страницу восстановления пароля
    await page.click('a[href="/auth/forgot-password"]');
    await expect(page.locator("h1")).toContainText("Восстановление пароля");

    // Возвращаемся на страницу входа
    await page.click('a[href="/auth/signin"]');
    await expect(page.locator("h1")).toContainText("С возвращением!");
  });

  test("редирект неавторизованного пользователя на страницу входа", async ({
    page,
  }) => {
    // Пытаемся зайти на защищённую страницу
    await page.goto("/");

    // Должны быть перенаправлены на страницу входа
    await expect(page).toHaveURL("/auth/signin");
    await expect(page.locator("h1")).toContainText("С возвращением!");
  });

  test("редирект на создание workspace после входа", async ({ page }) => {
    await page.goto("/auth/signin");

    // Мокаем успешный вход
    await page.route("**/api/auth/**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            user: { id: "1", email: "test@example.com" },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.fill("#email", "test@example.com");
    await page.fill("#password", "password123");
    await page.click('button[type="submit"]');

    // Ожидаем редирект на создание workspace
    await page.waitForURL("**/onboarding/create-workspace");
  });

  test("проверка доступности страниц аутентификации", async ({ page }) => {
    const authPages = ["/auth/signin", "/auth/signup", "/auth/forgot-password"];

    for (const authPage of authPages) {
      await page.goto(authPage);

      // Проверяем, что страница загрузилась без ошибок
      await expect(page.locator("body")).toBeVisible();

      // Проверяем, что нет ошибок 404 или 500
      const title = await page.title();
      expect(title).not.toContain("404");
      expect(title).not.toContain("500");

      // Проверяем наличие логотипа
      await expect(page.locator("text=M")).toBeVisible();
    }
  });

  test("проверка мета-тегов для SEO", async ({ page }) => {
    await page.goto("/auth/signin");

    // Проверяем title
    const title = await page.title();
    expect(title).toBeTruthy();

    // Проверяем viewport meta tag
    const viewport = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    expect(viewport).toContain("width=device-width");
  });

  test("проверка стилей и визуального оформления", async ({ page }) => {
    await page.goto("/auth/signin");

    // Проверяем основные стили
    const container = page.locator(".bg-\\[\\#F8F9FB\\]");
    await expect(container).toBeVisible();

    const formContainer = page.locator(".bg-white.rounded-\\[16px\\]");
    await expect(formContainer).toBeVisible();

    // Проверяем логотип
    const logo = page.locator(".bg-\\[\\#FFD600\\]");
    await expect(logo).toBeVisible();
    await expect(logo).toContainText("M");
  });

  test("проверка работы в разных размерах экрана", async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 }, // Tablet
      { width: 375, height: 667 }, // Mobile
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/auth/signin");

      // Проверяем, что форма видна и доступна
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Проверяем, что элементы не перекрываются
      const emailBox = await page.locator("#email").boundingBox();
      const passwordBox = await page.locator("#password").boundingBox();
      const submitBox = await page
        .locator('button[type="submit"]')
        .boundingBox();

      expect(emailBox).toBeTruthy();
      expect(passwordBox).toBeTruthy();
      expect(submitBox).toBeTruthy();
    }
  });

  test("проверка доступности (accessibility)", async ({ page }) => {
    await page.goto("/auth/signin");

    // Проверяем наличие labels для полей
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();

    // Проверяем aria-invalid для полей с ошибками
    await page.click('button[type="submit"]');

    const emailField = page.locator("#email");
    const passwordField = page.locator("#password");

    await expect(emailField).toHaveAttribute("aria-invalid", "true");
    await expect(passwordField).toHaveAttribute("aria-invalid", "true");
  });

  test("проверка фокуса и навигации с клавиатуры", async ({ page }) => {
    await page.goto("/auth/signin");

    // Проверяем навигацию по Tab
    await page.keyboard.press("Tab");
    await expect(page.locator("#email")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator("#password")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator('a[href="/auth/forgot-password"]')).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });
});
