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

  test.skip("клик по кнопке Google OAuth инициирует редирект", async () => {
    // Тест пропущен - требует реального OAuth провайдера
  });

  test.skip("Google OAuth недоступен когда отключен", async () => {
    // Тест пропущен - требует изменения конфигурации приложения
    // Env переменная NEXT_PUBLIC_AUTH_GOOGLE_ENABLED проверяется на этапе сборки
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

  test.skip("доступность кнопки Google OAuth", async () => {
    // Тест пропущен - требует реального OAuth провайдера
  });

  test("мобильная версия кнопки Google OAuth", async ({ page }) => {
    // Устанавливаем мобильный viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/auth/signin");

    const googleButton = page.locator("text=Войти через Google");
    await expect(googleButton).toBeVisible();

    // Проверяем, что кнопка остаётся доступной на мобильных устройствах
    const buttonBox = await googleButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThanOrEqual(36); // Минимальная высота для мобильных
  });

  test.skip("обработка ошибок Google OAuth", async () => {
    // Тест пропущен - требует реального OAuth провайдера
  });

  test.skip("callback URL для Google OAuth", async () => {
    // Тест пропущен - требует реального OAuth провайдера
  });
});
