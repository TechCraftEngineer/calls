import { expect, test } from "@playwright/test";

test.describe("Страница восстановления пароля", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/forgot-password");
  });

  test("отображает форму восстановления пароля", async ({ page }) => {
    // Проверяем основные элементы страницы
    await expect(page.locator("h1")).toContainText("Восстановление пароля");
    await expect(
      page.locator("text=Введите email — мы отправим ссылку для сброса пароля"),
    ).toBeVisible();

    // Проверяем поля формы
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText(
      "Отправить ссылку",
    );
  });

  test("показывает ошибку валидации для пустого email", async ({ page }) => {
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Введите email")).toBeVisible();
  });

  test("показывает ошибку для некорректного email", async ({ page }) => {
    await page.fill("#email", "неправильный-email");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Введите корректный email")).toBeVisible();
  });

  test("отправляет запрос на восстановление пароля", async ({ page }) => {
    await page.fill("#email", "test@example.com");

    // Перехватываем запрос восстановления пароля
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth") &&
        response.request().method() === "POST",
    );

    await page.click('button[type="submit"]');

    // Проверяем, что кнопка показывает состояние загрузки
    await expect(page.locator('button[type="submit"]')).toContainText(
      "Отправка…",
    );

    await responsePromise;
  });

  test("показывает сообщение об успешной отправке", async ({ page }) => {
    await page.fill("#email", "test@example.com");

    // Мокаем успешный ответ
    await page.route("**/api/auth/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.click('button[type="submit"]');

    // Проверяем сообщение об успехе
    await expect(page.locator("text=Письмо отправлено")).toBeVisible();
    await expect(page.locator("text=✅")).toBeVisible();

    // Проверяем, что появилась кнопка возврата ко входу
    await expect(page.locator("text=Вернуться ко входу")).toBeVisible();
  });

  test("показывает ссылку возврата ко входу", async ({ page }) => {
    const backLink = page.locator('a[href="/auth/signin"]').first();
    await expect(backLink).toContainText("← Вернуться ко входу");
    await expect(backLink).toBeVisible();
  });

  test("поддерживает автозаполнение email", async ({ page }) => {
    const emailField = page.locator("#email");
    await expect(emailField).toHaveAttribute("autocomplete", "email");
  });

  test("поддерживает отправку формы по Enter", async ({ page }) => {
    await page.fill("#email", "test@example.com");

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth") &&
        response.request().method() === "POST",
    );

    await page.press("#email", "Enter");
    await responsePromise;
  });

  test("проверяет плейсхолдер поля email", async ({ page }) => {
    await expect(page.locator("#email")).toHaveAttribute(
      "placeholder",
      "example@mail.com",
    );
  });

  test("проверяет копирайт", async ({ page }) => {
    const currentYear = new Date().getFullYear();
    await expect(
      page.locator(`text=© ${currentYear} QBS Звонки`),
    ).toBeVisible();
  });

  test("скрывает форму после успешной отправки", async ({ page }) => {
    await page.fill("#email", "test@example.com");

    // Мокаем успешный ответ
    await page.route("**/api/auth/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.click('button[type="submit"]');

    // Проверяем, что форма скрыта
    await expect(page.locator("#email")).not.toBeVisible();
    await expect(page.locator('button[type="submit"]')).not.toBeVisible();

    // Но кнопка возврата видна
    await expect(page.locator("text=Вернуться ко входу")).toBeVisible();
  });
});
