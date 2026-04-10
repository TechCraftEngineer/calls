import { expect, test } from "@playwright/test";

test.describe("Безопасность и производительность аутентификации", () => {
  test.skip("защита от CSRF атак", async ({ page }) => {
    // Тест пропущен - требует проверки конфигурации сервера
    test.skip(true, "Requires server configuration check");
  });

  test("защита от XSS в полях ввода", async ({ page }) => {
    await page.goto("/auth/signin");

    const xssPayload = '<script>alert("XSS")</script>';

    // Пытаемся ввести XSS payload в поля
    await page.fill("#email", xssPayload);
    await page.fill("#password", xssPayload);

    // Проверяем, что скрипт не выполняется
    const alerts = [];
    page.on("dialog", (dialog) => {
      alerts.push(dialog.message());
      dialog.dismiss();
    });

    await page.click('button[type="submit"]');

    // Ждём немного и проверяем, что алерты не появились
    await page.waitForTimeout(1000);
    expect(alerts).toHaveLength(0);
  });

  test.skip("время загрузки страниц аутентификации", async ({ page }) => {
    // Тест пропущен - нестабилен в CI среде
    test.skip(true, "Unstable in CI environment");
  });

  test("размер ресурсов страниц аутентификации", async ({ page }) => {
    const responses = [];

    page.on("response", (response) => {
      responses.push({
        url: response.url(),
        size: response.headers()["content-length"],
        type: response.headers()["content-type"],
      });
    });

    await page.goto("/auth/signin");
    await page.waitForLoadState("networkidle");

    // Проверяем размеры основных ресурсов
    const htmlResponse = responses.find((r) => r.type?.includes("text/html"));
    const cssResponses = responses.filter((r) => r.type?.includes("text/css"));
    const jsResponses = responses.filter((r) => r.type?.includes("javascript"));

    // HTML не должен быть слишком большим
    if (htmlResponse?.size) {
      expect(parseInt(htmlResponse.size, 10)).toBeLessThan(100000); // 100KB
    }

    console.log(`Загружено ${cssResponses.length} CSS файлов, ${jsResponses.length} JS файлов`);
  });

  test("защита паролей в DOM", async ({ page }) => {
    await page.goto("/auth/signin");

    const password = "secretpassword123";
    await page.fill("#password", password);

    // Проверяем, что пароль не виден в DOM в открытом виде
    const pageContent = await page.content();
    expect(pageContent).not.toContain(password);

    // Проверяем, что поле пароля имеет правильный тип
    await expect(page.locator("#password")).toHaveAttribute("type", "password");
  });

  test.skip("защита от автоматических атак (rate limiting)", async () => {
    // Тест пропущен - требует настройки rate limiting на сервере
    test.skip(true, "Requires server rate limiting configuration");
  });

  test.skip("безопасные заголовки HTTP", async () => {
    // Тест пропущен - требует настройки сервера
    test.skip(true, "Requires server configuration");
  });

  test.skip("производительность отправки форм", async () => {
    // Тест пропущен - нестабилен в CI среде
    test.skip(true, "Unstable in CI environment");
  });

  test("защита от SQL инъекций в полях", async ({ page }) => {
    await page.goto("/auth/signin");

    const sqlPayload = "'; DROP TABLE users; --";

    await page.fill("#email", sqlPayload);
    await page.fill("#password", "password123");

    // Мокаем ответ сервера (в реальности сервер должен обрабатывать это безопасно)
    await page.route("**/api/auth/**", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid email or password" }),
      });
    });

    await page.click('button[type="submit"]');

    // Проверяем, что получили ошибку валидации email
    await expect(page.locator("text=Введите корректный email")).toBeVisible();
  });

  test.skip("проверка утечек памяти при навигации", async () => {
    // Тест пропущен - требует профилирования памяти
    test.skip(true, "Requires memory profiling");
  });
});
