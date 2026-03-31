import { expect, test } from "@playwright/test";

test.describe("Страница регистрации", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/signup");
  });

  test("отображает форму регистрации", async ({ page }) => {
    // Проверяем основные элементы страницы
    await expect(page.locator("h1")).toContainText("Регистрация");
    await expect(page.locator("text=Создайте аккаунт QBS Звонки")).toBeVisible();

    // Проверяем поля формы
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#givenName")).toBeVisible();
    await expect(page.locator("#familyName")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Зарегистрироваться");
  });

  test("показывает ошибки валидации для пустых обязательных полей", async ({ page }) => {
    await page.click('button[type="submit"]');

    // Проверяем ошибки валидации для обязательных полей
    await expect(page.locator("text=Введите корректный email")).toBeVisible();
    await expect(page.locator("text=Имя обязательно")).toBeVisible();
    await expect(page.locator("text=Пароль должен содержать минимум 8 символов")).toBeVisible();
  });

  test("показывает ошибку для некорректного email", async ({ page }) => {
    await page.fill("#email", "неправильный-email");
    await page.fill("#givenName", "Иван");
    await page.fill("#password", "Password123");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Введите корректный email")).toBeVisible();
  });

  test("показывает ошибку для короткого пароля", async ({ page }) => {
    await page.fill("#email", "test@example.com");
    await page.fill("#givenName", "Иван");
    await page.fill("#password", "123");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Пароль должен содержать минимум 8 символов")).toBeVisible();
  });

  test("успешно отправляет форму с валидными данными", async ({ page }) => {
    await page.fill("#email", "newuser@example.com");
    await page.fill("#givenName", "Иван");
    await page.fill("#familyName", "Иванов");
    await page.fill("#password", "Password123");

    // Перехватываем запрос регистрации
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth") && response.request().method() === "POST",
    );

    await page.click('button[type="submit"]');

    // Проверяем, что кнопка показывает состояние загрузки
    await expect(page.locator('button[type="submit"]')).toContainText("Регистрация…");

    await responsePromise;
  });

  test("работает без фамилии (необязательное поле)", async ({ page }) => {
    await page.fill("#email", "test@example.com");
    await page.fill("#givenName", "Иван");
    await page.fill("#password", "Password123");

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth") && response.request().method() === "POST",
    );

    await page.click('button[type="submit"]');
    await responsePromise;
  });

  test("показывает ссылку на страницу входа", async ({ page }) => {
    const signinLink = page.locator('a[href="/auth/signin"]');
    await expect(signinLink).toContainText("Войдите");
    await expect(signinLink).toBeVisible();
  });

  test("показывает кнопку регистрации через Google", async ({ page }) => {
    const googleButton = page.locator("text=Зарегистрироваться через Google");
    await expect(googleButton).toBeVisible();

    // Проверяем иконку Google
    await expect(page.locator("svg").first()).toBeVisible();
  });

  test("поддерживает автозаполнение полей", async ({ page }) => {
    const emailField = page.locator("#email");
    const givenNameField = page.locator("#givenName");
    const familyNameField = page.locator("#familyName");
    const passwordField = page.locator("#password");

    await expect(emailField).toHaveAttribute("autocomplete", "email");
    await expect(givenNameField).toHaveAttribute("autocomplete", "given-name");
    await expect(familyNameField).toHaveAttribute("autocomplete", "family-name");
    await expect(passwordField).toHaveAttribute("autocomplete", "new-password");
  });

  test("поддерживает отправку формы по Enter", async ({ page }) => {
    await page.fill("#email", "test@example.com");
    await page.fill("#givenName", "Иван");
    await page.fill("#password", "Password123");

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth") && response.request().method() === "POST",
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

  test("проверяет плейсхолдеры полей", async ({ page }) => {
    await expect(page.locator("#email")).toHaveAttribute("placeholder", "example@mail.com");
    await expect(page.locator("#givenName")).toHaveAttribute("placeholder", "Иван");
    await expect(page.locator("#familyName")).toHaveAttribute("placeholder", "Иванов");
    await expect(page.locator("#password")).toHaveAttribute("placeholder", "••••••••");
  });

  test("проверяет копирайт", async ({ page }) => {
    const currentYear = new Date().getFullYear();
    await expect(page.locator(`text=© ${currentYear} QBS Звонки`)).toBeVisible();
  });
});
