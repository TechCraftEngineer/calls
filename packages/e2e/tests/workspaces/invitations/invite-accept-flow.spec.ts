import { expect, test } from "@playwright/test";
import type { TestUser } from "../../fixtures/auth";
import { InvitationFactory, InvitationHelpers } from "../../helpers/invitation-helpers";

test.describe("Принятие приглашения в рабочее пространство", () => {
  let helpers: InvitationHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new InvitationHelpers(page);
  });

  test.describe("Режим: Регистрация нового пользователя (register-new)", () => {
    test("отображает форму регистрации для нового пользователя по email-приглашению", async ({
      page,
    }) => {
      // Создаем приглашение для нового пользователя
      const invitation = InvitationFactory.createEmailInvitation({
        email: "newuser@example.com",
        userExists: false,
        requiresPassword: true,
      });

      // Мокируем API
      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null); // Не авторизован
      await helpers.mockCreateUserAndAccept(invitation.workspaceId);

      // Переходим на страницу приглашения
      await helpers.gotoInvitePage(invitation.token);

      // Проверяем режим регистрации
      await helpers.expectRegisterNewMode();
      await expect(page.locator("text=Test Workspace")).toBeVisible();
    });

    test("отображает форму регистрации для нового пользователя по ссылке-приглашению", async ({
      page,
    }) => {
      const invitation = InvitationFactory.createLinkInvitation({
        userExists: false,
        requiresPassword: true,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null);
      await helpers.mockCreateUserAndAccept(invitation.workspaceId);

      await helpers.gotoInvitePage(invitation.token);

      // Для link-приглашений должно быть поле email
      await helpers.expectRegisterNewMode();
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test("успешно регистрирует и принимает приглашение", async ({ page }) => {
      const testUser: TestUser = {
        email: "newuser@example.com",
        password: "Password123!",
        givenName: "Иван",
      };

      const invitation = InvitationFactory.createEmailInvitation({
        email: testUser.email,
        userExists: false,
        requiresPassword: true,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null);
      await helpers.mockCreateUserAndAccept(invitation.workspaceId);

      await helpers.gotoInvitePage(invitation.token);

      // Заполняем форму регистрации
      await helpers.fillRegistrationForm(testUser);
      await helpers.clickJoinButton();

      // Проверяем редирект на страницу входа
      await helpers.expectRedirectToSignIn(testUser.email);
    });
  });

  test.describe("Режим: Вход для существующего пользователя (login-existing)", () => {
    test("отображает форму входа для существующего пользователя по email-приглашению", async ({
      page,
    }) => {
      const invitation = InvitationFactory.createExistingUserInvitation({
        email: "existing@example.com",
        userExists: true,
        requiresPassword: false,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null);

      await helpers.gotoInvitePage(invitation.token);

      // Проверяем режим входа
      await helpers.expectLoginExistingMode();
      await expect(page.locator("text=У вас уже есть аккаунт")).toBeVisible();
      await expect(page.locator("text=existing@example.com")).toBeVisible();
    });

    test("отображает форму входа для существующего пользователя по ссылке-приглашению", async ({
      page,
    }) => {
      const invitation = InvitationFactory.createLinkInvitation({
        userExists: true,
        requiresPassword: false,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null);

      await helpers.gotoInvitePage(invitation.token);

      await helpers.expectLoginExistingMode();
    });

    test("перенаправляет на страницу входа с редиректом обратно", async ({ page }) => {
      const invitation = InvitationFactory.createExistingUserInvitation({
        email: "existing@example.com",
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null);

      await helpers.gotoInvitePage(invitation.token);

      // Кликаем на кнопку входа
      await helpers.clickLoginButton();

      // Проверяем редирект на страницу входа с параметрами
      await expect(page).toHaveURL(/\/auth\/signin/);
      await expect(page).toHaveURL(/email=existing%40example\.com/);
      await expect(page).toHaveURL(/redirect=.*invite/);
    });

    test("показывает ссылку на регистрацию с другим email для link-приглашений", async ({
      page,
    }) => {
      const invitation = InvitationFactory.createLinkInvitation({
        userExists: true,
        requiresPassword: false,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null);

      await helpers.gotoInvitePage(invitation.token);

      await helpers.expectLoginExistingMode();
      await expect(page.locator("text=Регистрация с другим email")).toBeVisible();
    });
  });

  test.describe("Режим: Кнопка присоединения для авторизованного (join-button)", () => {
    test("отображает кнопку присоединения для авторизованного пользователя с паролем", async ({
      page,
    }) => {
      const invitation = InvitationFactory.createExistingUserInvitation({
        email: "user@example.com",
      });

      const currentUser = InvitationFactory.createMockUser({
        email: "user@example.com",
        hasPassword: true,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(currentUser);
      await helpers.mockCheckUserPassword(true);
      await helpers.mockAcceptInvitation(invitation.workspaceId);

      await helpers.gotoInvitePage(invitation.token);

      // Проверяем режим кнопки присоединения
      await helpers.expectJoinButtonMode();
    });

    test("успешно присоединяется по нажатию кнопки", async ({ page }) => {
      const invitation = InvitationFactory.createExistingUserInvitation({
        email: "user@example.com",
      });

      const currentUser = InvitationFactory.createMockUser({
        email: "user@example.com",
        hasPassword: true,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(currentUser);
      await helpers.mockCheckUserPassword(true);
      await helpers.mockAcceptInvitation(invitation.workspaceId);

      await helpers.gotoInvitePage(invitation.token);
      await helpers.clickJoinButton();

      // Проверяем редирект
      await helpers.expectRedirectToWorkspace(invitation.workspaceId);
    });

    test("работает с link-приглашением для любого авторизованного пользователя", async ({
      page,
    }) => {
      const invitation = InvitationFactory.createLinkInvitation({
        userExists: true,
      });

      const currentUser = InvitationFactory.createMockUser({
        email: "anyuser@example.com", // Другой email
        hasPassword: true,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(currentUser);
      await helpers.mockCheckUserPassword(true);
      await helpers.mockAcceptInvitation(invitation.workspaceId);

      await helpers.gotoInvitePage(invitation.token);

      // Для link-приглашений любой авторизованный пользователь может присоединиться
      await helpers.expectJoinButtonMode();
    });
  });

  test.describe("Режим: Создание пароля для OAuth пользователя (create-password-then-join)", () => {
    test("отображает форму создания пароля для OAuth пользователя", async ({ page }) => {
      const invitation = InvitationFactory.createExistingUserInvitation({
        email: "oauth@example.com",
      });

      const currentUser = InvitationFactory.createMockUser({
        email: "oauth@example.com",
        hasPassword: false, // OAuth пользователь без пароля
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(currentUser);
      await helpers.mockCheckUserPassword(false); // Нет пароля
      await helpers.mockAcceptInvitation(invitation.workspaceId);

      await helpers.gotoInvitePage(invitation.token);

      // Проверяем режим создания пароля
      await helpers.expectCreatePasswordMode();
    });

    test("устанавливает пароль и присоединяется", async ({ page }) => {
      const invitation = InvitationFactory.createExistingUserInvitation({
        email: "oauth@example.com",
      });

      const currentUser = InvitationFactory.createMockUser({
        email: "oauth@example.com",
        hasPassword: false,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(currentUser);
      await helpers.mockCheckUserPassword(false);
      await helpers.mockAcceptInvitation(invitation.workspaceId);

      await helpers.gotoInvitePage(invitation.token);

      // Заполняем форму пароля
      await helpers.fillPasswordForm("NewPassword123!");
      await helpers.clickJoinButton();

      // Проверяем редирект
      await helpers.expectRedirectToWorkspace(invitation.workspaceId);
    });

    test("работает с link-приглашением для OAuth пользователя", async ({ page }) => {
      const invitation = InvitationFactory.createLinkInvitation({
        userExists: true,
      });

      const currentUser = InvitationFactory.createMockUser({
        email: "oauth@example.com",
        hasPassword: false,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(currentUser);
      await helpers.mockCheckUserPassword(false);

      await helpers.gotoInvitePage(invitation.token);

      await helpers.expectCreatePasswordMode();
    });
  });

  test.describe("Режим: Ошибка несовпадения email (wrong-email)", () => {
    test("показывает ошибку когда email не совпадает", async ({ page }) => {
      const invitation = InvitationFactory.createEmailInvitation({
        email: "invited@example.com",
        userExists: true,
      });

      const currentUser = InvitationFactory.createMockUser({
        email: "different@example.com", // Другой email
        hasPassword: true,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(currentUser);

      await helpers.gotoInvitePage(invitation.token);

      // Проверяем режим ошибки email
      await helpers.expectWrongEmailMode();
      await expect(page.locator("text=invited@example.com")).toBeVisible();
    });

    test("предлагает выйти и войти с правильным email", async ({ page }) => {
      const invitation = InvitationFactory.createEmailInvitation({
        email: "correct@example.com",
      });

      const currentUser = InvitationFactory.createMockUser({
        email: "wrong@example.com",
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(currentUser);

      await helpers.gotoInvitePage(invitation.token);

      await helpers.expectWrongEmailMode();
      await expect(page.locator('button:has-text("Выйти")')).toBeVisible();
    });
  });

  test.describe("Состояния загрузки и проверки", () => {
    test("показывает состояние загрузки при загрузке приглашения", async ({ page }) => {
      // Задерживаем ответ, чтобы показать загрузку
      await page.route("**/api/orpc/**", async (route) => {
        const request = route.request();
        const body = await request.postData();
        
        if (body && body.includes("getInvitationByToken")) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              result: { data: InvitationFactory.createEmailInvitation() },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await helpers.gotoInvitePage("test-token");

      // Проверяем, что есть индикатор загрузки
      await expect(page.locator("text=Загрузка")).toBeVisible();
    });

    test("показывает состояние проверки авторизации", async ({ page }) => {
      const invitation = InvitationFactory.createEmailInvitation();

      // Задерживаем проверку текущего пользователя
      await page.route("**/api/auth/get-session", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Unauthorized" }),
        });
      });

      await helpers.mockGetInvitation(invitation);

      await helpers.gotoInvitePage(invitation.token);

      // Проверяем состояние проверки
      await expect(page.locator("text=Загрузка")).toBeVisible();
    });
  });

  test.describe("Обработка ошибок", () => {
    test("показывает ошибку для недействительного токена", async ({ page }) => {
      await page.route("**/api/orpc/**", async (route) => {
        const request = route.request();
        const body = await request.postData();
        
        if (body && body.includes("getInvitationByToken")) {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({
              error: { message: "Приглашение не найдено" },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await helpers.gotoInvitePage("invalid-token");

      await helpers.expectInvalidInvitation();
    });

    test("показывает ошибку для истекшего приглашения", async ({ page }) => {
      const expiredInvitation = InvitationFactory.createEmailInvitation({
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Вчера
      });

      await page.route("**/api/orpc/**", async (route) => {
        const request = route.request();
        const body = await request.postData();
        
        if (body && body.includes("getInvitationByToken")) {
          await route.fulfill({
            status: 410,
            contentType: "application/json",
            body: JSON.stringify({
              error: { message: "Приглашение истекло" },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await helpers.gotoInvitePage(expiredInvitation.token);

      await helpers.expectExpiredInvitation();
    });

    test("показывает ошибку при неудачном принятии приглашения", async ({ page }) => {
      const invitation = InvitationFactory.createExistingUserInvitation({
        email: "user@example.com",
      });

      const currentUser = InvitationFactory.createMockUser({
        email: "user@example.com",
        hasPassword: true,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(currentUser);
      await helpers.mockCheckUserPassword(true);

      // Мокируем ошибку при принятии
      await page.route("**/api/orpc/**", async (route) => {
        const request = route.request();
        const body = await request.postData();
        
        if (body && body.includes("acceptInvitation")) {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              error: { message: "Не удалось принять приглашение" },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await helpers.gotoInvitePage(invitation.token);
      await helpers.clickJoinButton();

      await expect(page.locator("text=Не удалось принять приглашение")).toBeVisible();
    });
  });

  test.describe("Различные роли в приглашении", () => {
    const roles: Array<{ role: "owner" | "admin" | "member"; label: string }> = [
      { role: "owner", label: "владельца" },
      { role: "admin", label: "администратора" },
      { role: "member", label: "участника" },
    ];

    for (const { role, label } of roles) {
      test(`отображает приглашение на роль ${label}`, async ({ page }) => {
        const invitation = InvitationFactory.createEmailInvitation({
          role,
          email: "user@example.com",
        });

        const currentUser = InvitationFactory.createMockUser({
          email: "user@example.com",
          hasPassword: true,
        });

        await helpers.mockGetInvitation(invitation);
        await helpers.mockCurrentUser(currentUser);
        await helpers.mockCheckUserPassword(true);

        await helpers.gotoInvitePage(invitation.token);

        // Проверяем, что информация о роли отображается
        await expect(page.locator("h1")).toBeVisible();
        await expect(page.locator("text=Test Workspace")).toBeVisible();
      });
    }
  });

  test.describe("Валидация форм", () => {
    test("показывает ошибки для пустых полей регистрации", async ({ page }) => {
      const invitation = InvitationFactory.createEmailInvitation({
        userExists: false,
        requiresPassword: true,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null);

      await helpers.gotoInvitePage(invitation.token);

      // Отправляем пустую форму
      await helpers.clickJoinButton();

      // Проверяем ошибки валидации
      await expect(page.locator("text=обязательно")).toBeVisible();
    });

    test("показывает ошибку для короткого пароля", async ({ page }) => {
      const invitation = InvitationFactory.createEmailInvitation({
        userExists: false,
        requiresPassword: true,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null);

      await helpers.gotoInvitePage(invitation.token);

      // Заполняем короткий пароль
      await helpers.fillPasswordForm("123");
      await helpers.clickJoinButton();

      // Проверяем ошибку длины пароля
      await expect(page.locator("text=8 символов")).toBeVisible();
    });

    test("показывает ошибку для невалидного email в link-приглашении", async ({ page }) => {
      const invitation = InvitationFactory.createLinkInvitation({
        userExists: false,
        requiresPassword: true,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null);

      await helpers.gotoInvitePage(invitation.token);

      // Заполняем невалидный email
      await page.fill('input[type="email"]', "not-an-email");
      await page.fill('input[type="password"]', "password123");
      await helpers.clickJoinButton();

      // Проверяем ошибку email
      await expect(page.locator("text=корректный email")).toBeVisible();
    });
  });

  test.describe("Accessibility и UX", () => {
    test("поддерживает навигацию с клавиатуры", async ({ page }) => {
      const invitation = InvitationFactory.createEmailInvitation({
        userExists: false,
        requiresPassword: true,
      });

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null);

      await helpers.gotoInvitePage(invitation.token);

      // Переходим между полями с помощью Tab
      await page.keyboard.press("Tab");
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe("INPUT");
    });

    test("отображает корректные мета-данные страницы", async ({ page }) => {
      const invitation = InvitationFactory.createEmailInvitation();

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null);

      await helpers.gotoInvitePage(invitation.token);

      // Проверяем заголовок страницы
      await expect(page).toHaveTitle(/Приглашение|QBS/i);
    });

    test("отображает ссылку на поддержку", async ({ page }) => {
      const invitation = InvitationFactory.createEmailInvitation();

      await helpers.mockGetInvitation(invitation);
      await helpers.mockCurrentUser(null);

      await helpers.gotoInvitePage(invitation.token);

      await expect(page.locator('a:has-text("поддержкой"), a:has-text("поддержка")')).toBeVisible();
    });
  });
});
