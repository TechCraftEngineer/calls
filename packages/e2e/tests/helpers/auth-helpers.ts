import { expect, type Page } from "@playwright/test";
import type { TestUser } from "../fixtures/auth";

/**
 * Вспомогательные функции для тестирования аутентификации
 */
export class AuthHelpers {
  constructor(private page: Page) {}

  /**
   * Заполняет форму входа
   */
  async fillSignInForm(user: TestUser) {
    await this.page.fill("#email", user.email);
    await this.page.fill("#password", user.password);
  }

  /**
   * Заполняет форму регистрации
   */
  async fillSignUpForm(user: TestUser) {
    await this.page.fill("#email", user.email);
    await this.page.fill("#givenName", user.givenName);
    if (user.familyName) {
      await this.page.fill("#familyName", user.familyName);
    }
    await this.page.fill("#password", user.password);
  }

  /**
   * Отправляет форму входа
   */
  async submitSignInForm() {
    await this.page.click('button[type="submit"]');
  }

  /**
   * Отправляет форму регистрации
   */
  async submitSignUpForm() {
    await this.page.click('button[type="submit"]');
  }

  /**
   * Проверяет наличие ошибки валидации
   */
  async expectValidationError(message: string) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
  }

  /**
   * Проверяет состояние загрузки кнопки
   */
  async expectLoadingState(buttonText: string) {
    await expect(this.page.locator('button[type="submit"]')).toContainText(
      buttonText,
    );
    await expect(this.page.locator('button[type="submit"]')).toBeDisabled();
  }

  /**
   * Мокает успешный ответ аутентификации
   */
  async mockSuccessfulAuth(user?: TestUser) {
    await this.page.route("**/api/auth/**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            user: user
              ? {
                  id: "1",
                  email: user.email,
                  name: `${user.givenName} ${user.familyName || ""}`.trim(),
                }
              : {
                  id: "1",
                  email: "test@example.com",
                  name: "Test User",
                },
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Мокает ошибку аутентификации
   */
  async mockAuthError(errorMessage: string = "Неверный email или пароль") {
    await this.page.route("**/api/auth/**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: { message: errorMessage },
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Проверяет редирект после успешной аутентификации
   */
  async expectRedirectToWorkspace() {
    await this.page.waitForURL("**/onboarding/create-workspace");
  }

  /**
   * Проверяет основные элементы страницы входа
   */
  async expectSignInPageElements() {
    await expect(this.page.locator("h1")).toContainText("С возвращением!");
    await expect(this.page.locator("#email")).toBeVisible();
    await expect(this.page.locator("#password")).toBeVisible();
    await expect(this.page.locator('button[type="submit"]')).toContainText(
      "Войти в систему",
    );
  }

  /**
   * Проверяет основные элементы страницы регистрации
   */
  async expectSignUpPageElements() {
    await expect(this.page.locator("h1")).toContainText("Регистрация");
    await expect(this.page.locator("#email")).toBeVisible();
    await expect(this.page.locator("#givenName")).toBeVisible();
    await expect(this.page.locator("#familyName")).toBeVisible();
    await expect(this.page.locator("#password")).toBeVisible();
    await expect(this.page.locator('button[type="submit"]')).toContainText(
      "Зарегистрироваться",
    );
  }

  /**
   * Проверяет основные элементы страницы восстановления пароля
   */
  async expectForgotPasswordPageElements() {
    await expect(this.page.locator("h1")).toContainText(
      "Восстановление пароля",
    );
    await expect(this.page.locator("#email")).toBeVisible();
    await expect(this.page.locator('button[type="submit"]')).toContainText(
      "Отправить ссылку",
    );
  }

  /**
   * Проверяет наличие Google OAuth кнопки
   */
  async expectGoogleAuthButton(buttonText: string) {
    await expect(this.page.locator(`text=${buttonText}`)).toBeVisible();
    await expect(this.page.locator("svg").first()).toBeVisible();
  }

  /**
   * Проверяет сообщения об успехе
   */
  async expectSuccessMessage(message: string) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
    await expect(this.page.locator("text=✅")).toBeVisible();
  }

  /**
   * Проверяет сообщения об ошибке
   */
  async expectErrorMessage(message: string) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
    await expect(this.page.locator("text=⚠️")).toBeVisible();
  }

  /**
   * Ждёт ответа от API аутентификации
   */
  async waitForAuthResponse() {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth") &&
        response.request().method() === "POST",
    );
  }

  /**
   * Проверяет доступность элементов формы
   */
  async expectFormAccessibility() {
    // Проверяем labels
    await expect(this.page.locator('label[for="email"]')).toBeVisible();
    await expect(this.page.locator('label[for="password"]')).toBeVisible();

    // Проверяем autocomplete
    await expect(this.page.locator("#email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
  }

  /**
   * Тестирует навигацию с клавиатуры
   */
  async testKeyboardNavigation() {
    await this.page.keyboard.press("Tab");
    await expect(this.page.locator("#email")).toBeFocused();

    await this.page.keyboard.press("Tab");
    await expect(this.page.locator("#password")).toBeFocused();
  }
}
