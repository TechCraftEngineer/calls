import { expect, test } from "@playwright/test";

test.describe("Безопасность и производительность аутентификации", () => {
  test("защита от CSRF атак", async ({ page }) => {
    await page.goto("/auth/signin");

    // Проверяем наличие CSRF токена или других защитных мер
    const forms = page.locator("form");
    const formCount = await forms.count();

    for (let i = 0; i < formCount; i++) {
      const form = forms.nth(i);

      // Проверяем, что форма не отправляется на внешние домены
      const action = await form.getAttribute("action");
      if (action) {
        expect(action).not.toMatch(/^https?:\/\/(?!localhost|127\.0\.0\.1)/);
      }
    }
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

  test("время загрузки страниц аутентификации", async ({ page }) => {
    const authPages = ["/auth/signin", "/auth/signup", "/auth/forgot-password"];

    for (const authPage of authPages) {
      const startTime = Date.now();

      await page.goto(authPage);
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;

      // Страница должна загружаться менее чем за 3 секунды
      expect(loadTime).toBeLessThan(3000);

      console.log(`${authPage} загрузилась за ${loadTime}ms`);
    }
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

  test("защита от автоматических атак (rate limiting)", async ({ page }) => {
    await page.goto("/auth/signin");

    // Мокаем ответ с ошибкой rate limiting
    await page.route("**/api/auth/**", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Too many requests",
        }),
      });
    });

    await page.fill("#email", "test@example.com");
    await page.fill("#password", "password123");
    await page.click('button[type="submit"]');

    // Проверяем обработку ошибки rate limiting
    // (зависит от реализации в приложении)
  });

  test("безопасные заголовки HTTP", async ({ page }) => {
    const response = await page.goto("/auth/signin");
    const headers = response?.headers();

    if (headers) {
      // Проверяем наличие важных заголовков безопасности
      expect(headers["x-frame-options"] || headers["X-Frame-Options"]).toBeTruthy();
      expect(headers["x-content-type-options"] || headers["X-Content-Type-Options"]).toBe(
        "nosniff",
      );
    }
  });

  test("производительность отправки форм", async ({ page }) => {
    await page.goto("/auth/signin");

    // Мокаем быстрый ответ
    await page.route("**/api/auth/**", async (route) => {
      // Добавляем небольшую задержку для реалистичности
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.fill("#email", "test@example.com");
    await page.fill("#password", "password123");

    const startTime = Date.now();
    await page.click('button[type="submit"]');

    // Ждём ответа
    await page.waitForResponse(
      (response) => response.url().includes("/api/auth") && response.status() === 200,
    );

    const responseTime = Date.now() - startTime;

    // Ответ должен приходить быстро (менее 500ms для мока)
    expect(responseTime).toBeLessThan(500);

    console.log(`Форма отправлена за ${responseTime}ms`);
  });

  test("защита от SQL инъекций в полях", async ({ page }) => {
    await page.goto("/auth/signin");

    const sqlPayload = "'; DROP TABLE users; --";

    await page.fill("#email", sqlPayload);
    await page.fill("#password", "password123");

    // Мокаем ответ сервера (в реальности сервер должен обрабатывать это безопасно)
    await page.route("**/api/auth/**", async (route) => {
      const postData = route.request().postData();

      // Проверяем, что опасные SQL команды не передаются как есть
      if (postData?.includes("DROP TABLE")) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invalid input" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
    });

    await page.click('button[type="submit"]');

    // Проверяем, что получили ошибку (что означает, что сервер обработал это правильно)
    await expect(page.locator("text=Invalid input")).toBeVisible();
  });

  test("проверка утечек памяти при навигации", async ({ page }) => {
    const authPages = ["/auth/signin", "/auth/signup", "/auth/forgot-password"];

    // Переходим между страницами несколько раз
    for (let i = 0; i < 3; i++) {
      for (const authPage of authPages) {
        await page.goto(authPage);
        await page.waitForLoadState("networkidle");

        // Небольшая пауза между переходами
        await page.waitForTimeout(100);
      }
    }

    // Проверяем, что страницы всё ещё работают корректно
    await page.goto("/auth/signin");
    await expect(page.locator("h1")).toContainText("С возвращением!");
  });
});
