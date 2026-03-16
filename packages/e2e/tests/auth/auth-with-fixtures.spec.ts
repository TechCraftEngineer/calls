import { test } from "../fixtures/auth";
import { AuthHelpers } from "../helpers/auth-helpers";

test.describe("Тесты аутентификации с фикстурами", () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
  });

  test("успешный вход с валидными данными", async ({ page, validUser }) => {
    await page.goto("/auth/signin");
    await authHelpers.expectSignInPageElements();

    await authHelpers.mockSuccessfulAuth(validUser);
    await authHelpers.fillSignInForm(validUser);

    const responsePromise = authHelpers.waitForAuthResponse();
    await authHelpers.submitSignInForm();

    await authHelpers.expectLoadingState("Вход…");
    await responsePromise;
    await authHelpers.expectRedirectToWorkspace();
  });

  test("ошибка входа с неверными данными", async ({ page, invalidUser }) => {
    await page.goto("/auth/signin");

    await authHelpers.mockAuthError("Неверный email или пароль");
    await authHelpers.fillSignInForm(invalidUser);
    await authHelpers.submitSignInForm();

    await authHelpers.expectErrorMessage("Неверный email или пароль");
  });

  test("успешная регистрация с валидными данными", async ({
    page,
    validUser,
  }) => {
    await page.goto("/auth/signup");
    await authHelpers.expectSignUpPageElements();

    await authHelpers.mockSuccessfulAuth(validUser);
    await authHelpers.fillSignUpForm(validUser);

    const responsePromise = authHelpers.waitForAuthResponse();
    await authHelpers.submitSignUpForm();

    await authHelpers.expectLoadingState("Регистрация…");
    await responsePromise;
    await authHelpers.expectRedirectToWorkspace();
  });

  test("регистрация без фамилии", async ({ page, validUser }) => {
    await page.goto("/auth/signup");

    const userWithoutLastName = { ...validUser, familyName: undefined };
    await authHelpers.mockSuccessfulAuth(userWithoutLastName);

    await page.fill("#email", userWithoutLastName.email);
    await page.fill("#givenName", userWithoutLastName.givenName);
    await page.fill("#password", userWithoutLastName.password);

    const responsePromise = authHelpers.waitForAuthResponse();
    await authHelpers.submitSignUpForm();

    await responsePromise;
    await authHelpers.expectRedirectToWorkspace();
  });

  test("тестирование с несколькими пользователями", async ({
    page,
    testUsers,
  }) => {
    for (const user of testUsers) {
      await page.goto("/auth/signin");

      await authHelpers.mockSuccessfulAuth(user);
      await authHelpers.fillSignInForm(user);
      await authHelpers.submitSignInForm();

      await authHelpers.expectRedirectToWorkspace();

      // Возвращаемся для следующего теста
      await page.goto("/auth/signin");
    }
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
      await authHelpers.expectFormAccessibility();
    }
  });

  test("тестирование клавиатурной навигации", async ({ page }) => {
    await page.goto("/auth/signin");
    await authHelpers.testKeyboardNavigation();
  });

  test("восстановление пароля с валидным email", async ({
    page,
    validUser,
  }) => {
    await page.goto("/auth/forgot-password");
    await authHelpers.expectForgotPasswordPageElements();

    // Мокаем успешную отправку письма
    await page.route("**/api/auth/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.fill("#email", validUser.email);
    await page.click('button[type="submit"]');

    await authHelpers.expectSuccessMessage("Письмо отправлено");
  });
});
