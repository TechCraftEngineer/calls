import { expect, test } from "@playwright/test";

test.describe("Google OAuth аутентификация", () => {
  test.beforeEach(async ({ page }) => {
    // Мокаем Google OAuth endpoints
    await page.route("**/api/auth/signin/google**", async (route) => {
      // Редирект на Google OAuth
      await route.fulfill({
        status: 302,
        headers: {
          Location: "https://accounts.google.com/oauth/authorize?client_id=test&redirect_uri=test",
        },
      });
    });
  });

  test("кнопка Google OAuth на странице входа", async ({ page }) => {
    await page.goto("/auth/signin");

    const googleButton = page.locator("text=Войти через Google");
    await expect(googleButton).toBeVisible();

    // Проверяем иконку Google
    const googleIcon = page.locator("svg").first();
    await expect(googleIcon).toBeVisible();

    // Проверяем цвета иконки Google (основные пути SVG)
    await expect(page.locator('path[fill="#4285F4"]')).toBeVisible(); // Синий
    await expect(page.locator('path[fill="#34A853"]')).toBeVisible(); // Зелёный
    await expect(page.locator('path[fill="#FBBC05"]')).toBeVisible(); // Жёлтый
    await expect(page.locator('path[fill="#EA4335"]')).toBeVisible(); // Красный
  });

  test("кнопка Google OAuth на странице регистрации", async ({ page }) => {
    await page.goto("/auth/signup");

    const googleButton = page.locator("text=Зарегистрироваться через Google");
    await expect(googleButton).toBeVisible();

    // Проверяем иконку Google
    const googleIcon = page.locator("svg").first();
    await expect(googleIcon).toBeVisible();
  });

  test("клик по кнопке Google OAuth инициирует редирект", async ({ page }) => {
    await page.goto("/auth/signin");

    // Перехватываем запрос к Google OAuth
    const requestPromise = page.waitForRequest(
      (request) =>
        request.url().includes("/api/auth/signin/google") ||
        request.url().includes("accounts.google.com"),
    );

    await page.click("text=Войти через Google");

    await requestPromise;
  });

  test("Google OAuth недоступен когда отключен", async ({ page }) => {
    // Мокаем отключенный Google OAuth
    await page.addInitScript(() => {
      window.process = { env: { NEXT_PUBLIC_AUTH_GOOGLE_ENABLED: "false" } };
    });

    await page.goto("/auth/signin");

    // Кнопка Google OAuth не должна отображаться
    await expect(page.locator("text=Войти через Google")).not.toBeVisible();
    await expect(page.locator("text=или")).not.toBeVisible();
  });

  test('разделитель "или" отображается только с Google OAuth', async ({ page }) => {
    await page.goto("/auth/signin");

    // Проверяем наличие разделителя
    await expect(page.locator("text=или")).toBeVisible();

    // Проверяем стили разделителя
    const divider = page.locator(".border-t.border-\\[\\#DDD\\]");
    await expect(divider).toBeVisible();
  });

  test("стили кнопки Google OAuth", async ({ page }) => {
    await page.goto("/auth/signin");

    const googleButton = page.locator("text=Войти через Google");

    // Проверяем, что кнопка имеет правильный вариант (outline)
    await expect(googleButton).toHaveClass(/outline/);

    // Проверяем, что кнопка занимает всю ширину
    await expect(googleButton).toHaveClass(/w-full/);
  });

  test("доступность кнопки Google OAuth", async ({ page }) => {
    await page.goto("/auth/signin");

    const googleButton = page.locator("text=Войти через Google");

    // Проверяем, что кнопка доступна для клавиатурной навигации
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab"); // Переходим к Google кнопке

    await expect(googleButton).toBeFocused();

    // Проверяем активацию по Enter
    const requestPromise = page.waitForRequest((request) => request.url().includes("/api/auth"));

    await page.keyboard.press("Enter");
    await requestPromise;
  });

  test("мобильная версия кнопки Google OAuth", async ({ page }) => {
    // Устанавливаем мобильный viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/auth/signin");

    const googleButton = page.locator("text=Войти через Google");
    await expect(googleButton).toBeVisible();

    // Проверяем, что кнопка остаётся доступной на мобильных устройствах
    const buttonBox = await googleButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // Минимальная высота для мобильных
  });

  test("обработка ошибок Google OAuth", async ({ page }) => {
    // Мокаем ошибку Google OAuth
    await page.route("**/api/auth/signin/google**", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "OAuth provider error",
        }),
      });
    });

    await page.goto("/auth/signin");
    await page.click("text=Войти через Google");

    // Проверяем отображение ошибки (если есть обработка)
    // Это зависит от реализации обработки ошибок в приложении
  });

  test("callback URL для Google OAuth", async ({ page }) => {
    await page.goto("/auth/signin");

    // Перехватываем запрос и проверяем callback URL
    const requestPromise = page.waitForRequest((request) => {
      const url = request.url();
      return url.includes("/api/auth/signin/google") && url.includes("callbackURL");
    });

    await page.click("text=Войти через Google");

    const request = await requestPromise;
    const url = new URL(request.url());

    // Проверяем, что callback URL указывает на создание workspace
    expect(url.searchParams.get("callbackURL")).toContain("/onboarding/create-workspace");
  });
});
