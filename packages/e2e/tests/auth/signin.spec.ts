import { expect, test } from "@playwright/test";

test.describe("Страница входа", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/signin");
  });

  test("отображает форму входа", async ({ page }) => {
    // Проверяем основные элементы страницы
    await expect(page.locator("h1")).toContainText("С возвращением!");
    await expect(
      page.locator("text=Войдите в личный кабинет QBS Звонки"),
    ).toBeVisible();

    // Проверяем поля формы
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText(
      "Войти в систему",
    );
  });

  test("показывает ошибки валидации для пустых полей", async ({ page }) => {
    // Нажимаем кнопку входа без заполнения полей
    await page.click('button[type="submit"]');

    // Проверяем ошибки валидации
    await expect(page.locator("text=Введите email")).toBeVisible();
    await expect(page.locator("text=Пароль обязателен")).toBeVisible();
  });

  test("показывает ошибку для некорректного email", async ({ page }) => {
    await page.fill("#email", "неправильный-email");
    await page.fill("#password", "Password123");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Введите корректный email")).toBeVisible();
  });

  test("показывает ошибку для короткого пароля", async ({ page }) => {
    await page.fill("#email", "test@example.com");
    await page.fill("#password", "123");
    await page.click('button[type="submit"]');

    await expect(
      page.locator("text=Пароль должен содержать минимум 8 символов"),
    ).toBeVisible();
  });

  test("отправляет форму с валидными данными", async ({ page }) => {
    await page.fill("#email", "test@example.com");
    await page.fill("#password", "Password123");

    // Перехватываем запрос аутентификации
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth") &&
        response.request().method() === "POST",
    );

    await page.click('button[type="submit"]');

    // Проверяем, что кнопка показывает состояние загрузки
    await expect(page.locator('button[type="submit"]')).toContainText("Вход…");

    await responsePromise;
  });

  test("показывает ссылку на регистрацию", async ({ page }) => {
    const signupLink = page.locator('a[href="/auth/signup"]');
    await expect(signupLink).toContainText("Зарегистрируйтесь");
    await expect(signupLink).toBeVisible();
  });

  test("показывает ссылку на восстановление пароля", async ({ page }) => {
    const forgotPasswordLink = page.locator('a[href="/auth/forgot-password"]');
    await expect(forgotPasswordLink).toContainText("Забыли пароль?");
    await expect(forgotPasswordLink).toBeVisible();
  });

  test("показывает кнопку входа через Google", async ({ page }) => {
    const googleButton = page.locator("text=Войти через Google");
    await expect(googleButton).toBeVisible();

    // Проверяем иконку Google
    await expect(page.locator("svg").first()).toBeVisible();
  });

  test("показывает сообщение об успешной регистрации", async ({ page }) => {
    await page.goto("/auth/signin?message=registration_success");

    await expect(
      page.locator("text=Регистрация прошла успешно!"),
    ).toBeVisible();
    await expect(page.locator("text=✅")).toBeVisible();
  });

  test("показывает сообщение об успешном сбросе пароля", async ({ page }) => {
    await page.goto("/auth/signin?message=password_reset");

    await expect(page.locator("text=Пароль успешно изменён")).toBeVisible();
    await expect(page.locator("text=✅")).toBeVisible();
  });

  test("поддерживает автозаполнение полей", async ({ page }) => {
    const emailField = page.locator("#email");
    const passwordField = page.locator("#password");

    await expect(emailField).toHaveAttribute("autocomplete", "email");
    await expect(passwordField).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  test("поддерживает отправку формы по Enter", async ({ page }) => {
    await page.fill("#email", "test@example.com");
    await page.fill("#password", "Password123");

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth") &&
        response.request().method() === "POST",
    );

    await page.press("#password", "Enter");
    await responsePromise;
  });

  test("показывает/скрывает пароль при клике на иконку", async ({ page }) => {
    const passwordField = page.locator("#password");
    const toggleButton = page
      .locator('[data-testid="password-toggle"]')
      .or(page.locator("button").filter({ hasText: /показать|скрыть/i }));

    await page.fill("#password", "testpassword");

    // Изначально пароль скрыт
    await expect(passwordField).toHaveAttribute("type", "password");

    // Если есть кнопка переключения, тестируем её
    if ((await toggleButton.count()) > 0) {
      await toggleButton.click();
      await expect(passwordField).toHaveAttribute("type", "text");

      await toggleButton.click();
      await expect(passwordField).toHaveAttribute("type", "password");
    }
  });
});
