import { expect } from "@playwright/test";
import { test } from "../fixtures/auth";
import { AuthHelpers } from "../helpers/auth-helpers";

test.describe("Тесты аутентификации с фикстурами", () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
  });

  test.skip("успешный вход с валидными данными", async () => {
    // Тест пропущен - требует мокирования API
  });

  test.skip("ошибка входа с неверными данными", async () => {
    // Тест пропущен - требует мокирования API
  });

  test.skip("успешная регистрация с валидными данными", async () => {
    // Тест пропущен - требует мокирования API
  });

  test.skip("регистрация без фамилии", async () => {
    // Тест пропущен - требует мокирования API
  });

  test.skip("тестирование с несколькими пользователями", async () => {
    // Тест пропущен - требует мокирования API
  });

  test("проверка Google OAuth на всех страницах", async ({ page }) => {
    const authPages = [
      { url: "/auth/signin", buttonText: "Войти через Google" },
      { url: "/auth/signup", buttonText: "Зарегистрироваться через Google" },
    ];

    for (const authPage of authPages) {
      await page.goto(authPage.url);
      await authHelpers.expectGoogleAuthButton(authPage.buttonText);
    }
  });

  test("проверка доступности на всех страницах", async ({ page }) => {
    const authPages = ["/auth/signin", "/auth/signup", "/auth/forgot-password"];

    for (const authPage of authPages) {
      await page.goto(authPage);

      // Проверяем labels для email (общее для всех страниц)
      await expect(page.locator('label[for="email"]')).toBeVisible();

      // Проверяем autocomplete для email
      await expect(page.locator("#email")).toHaveAttribute("autocomplete", "email");
    }
  });

  test("тестирование клавиатурной навигации", async ({ page }) => {
    await page.goto("/auth/signin");
    await authHelpers.testKeyboardNavigation();
  });

  test.skip("восстановление пароля с валидным email", async () => {
    // Тест пропущен - требует мокирования API
  });
});
