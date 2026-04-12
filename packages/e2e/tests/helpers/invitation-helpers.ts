import { expect, type Page } from "@playwright/test";
import type { TestUser } from "../fixtures/auth";

/**
 * Типы для тестирования приглашений
 */
export interface InvitationData {
  token: string;
  email: string | null;
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member";
  userExists: boolean;
  requiresPassword: boolean;
  invitationType: "email" | "link";
  expiresAt: string;
}

export interface MockUser {
  id: string;
  email: string;
  name: string;
  hasPassword: boolean;
}

/**
 * Вспомогательные функции для тестирования приглашений
 */
export class InvitationHelpers {
  constructor(private page: Page) {}

  /**
   * Мокирует API получения приглашения
   */
  async mockGetInvitation(invitation: InvitationData) {
    await this.page.route("**/api/workspaces.getInvitationByToken", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            data: invitation,
          },
        }),
      });
    });
  }

  /**
   * Мокирует API получения приглашения (старый формат - прямой ответ)
   */
  async mockGetInvitationDirect(invitation: InvitationData) {
    await this.page.route("**/api/**invitation**", async (route) => {
      if (route.request().method() === "GET" || route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(invitation),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Мокирует проверку наличия пароля у пользователя
   */
  async mockCheckUserPassword(hasPassword: boolean, exists: boolean = true) {
    await this.page.route("**/api/workspaces.checkUserPassword", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            data: {
              hasPassword,
              exists,
            },
          },
        }),
      });
    });
  }

  /**
   * Мокирует проверку текущего пользователя
   */
  async mockCurrentUser(user: MockUser | null) {
    await this.page.route("**/api/auth/get-session", async (route) => {
      if (user) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Unauthorized" }),
        });
      }
    });
  }

  /**
   * Мокирует принятие приглашения
   */
  async mockAcceptInvitation(workspaceId: string) {
    const acceptInvitationResponse = {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          data: {
            workspaceId,
            success: true,
          },
        },
      }),
    };

    const acceptInvitationForExistingUserResponse = {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          data: {
            workspaceId,
            success: true,
          },
        },
      }),
    };

    await this.page.route("**/api/orpc/workspaces.acceptInvitation**", async (route) => {
      await route.fulfill(acceptInvitationResponse);
    });

    await this.page.route(
      "**/api/orpc/workspaces.acceptInvitationForExistingUser**",
      async (route) => {
        await route.fulfill(acceptInvitationForExistingUserResponse);
      },
    );
  }

  /**
   * Мокирует создание пользователя при принятии приглашения
   */
  async mockCreateUserAndAccept(workspaceId: string) {
    const response = {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          data: {
            workspaceId,
            userId: "new-user-id",
            success: true,
          },
        },
      }),
    };

    await this.page.route("**/api/workspaces.acceptInvitation**", async (route) => {
      await route.fulfill(response);
    });

    await this.page.route("**/api/workspaces.acceptInvitationForExistingUser**", async (route) => {
      await route.fulfill(response);
    });
  }

  /**
   * Переходит на страницу приглашения
   */
  async gotoInvitePage(token: string) {
    await this.page.goto(`/invite/${token}`);
  }

  /**
   * Проверяет, что отображается форма регистрации (register-new)
   */
  async expectRegisterNewMode() {
    await expect(this.page.locator("h1")).toContainText("Создайте аккаунт");
    await expect(this.page.locator("text=Вас пригласили в")).toBeVisible();
    // Должны быть поля для регистрации
    await expect(
      this.page.locator('input[name="name"], input[name="givenName"], #name').first(),
    ).toBeVisible();
    await expect(
      this.page.locator('input[type="password"], [data-testid="password-input"]').first(),
    ).toBeVisible();
    // Кнопка должна содержать текст о создании аккаунта
    await expect(this.page.locator('button[type="submit"]')).toContainText(
      /Создать|Принять|Зарегистрироваться/i,
    );
  }

  /**
   * Проверяет, что отображается форма входа (login-existing)
   */
  async expectLoginExistingMode() {
    await expect(this.page.locator("h1")).toContainText(/Присоедин|Войти|Вход/i);
    await expect(this.page.locator("text=У вас уже есть аккаунт")).toBeVisible();
    // Должна быть кнопка для входа
    await expect(this.page.locator("button")).toContainText(/Войти|Присоединиться/i);
  }

  /**
   * Проверяет, что отображается кнопка присоединения (join-button)
   */
  async expectJoinButtonMode() {
    await expect(this.page.locator("h1")).toContainText(/Присоедин|Приглашение/i);
    // Должна быть кнопка присоединения без полей ввода
    const joinButton = this.page
      .locator(
        'button:has-text("Присоединиться"), button:has-text("Вступить"), button:has-text("Принять")',
      )
      .first();
    await expect(joinButton).toBeVisible();
    // Не должно быть полей для ввода пароля
    await expect(this.page.locator('input[type="password"]')).not.toBeVisible();
  }

  /**
   * Проверяет, что отображается форма создания пароля (create-password-then-join)
   */
  async expectCreatePasswordMode() {
    await expect(this.page.locator("h1")).toContainText(/установите пароль|создайте пароль/i);
    await expect(this.page.locator("text=нет пароля")).toBeVisible();
    // Должно быть поле для ввода пароля и кнопка
    await expect(this.page.locator('input[type="password"]')).toBeVisible();
    await expect(this.page.locator('button[type="submit"]')).toContainText(
      /Установить|Сохранить|Присоединиться/i,
    );
  }

  /**
   * Проверяет, что отображается ошибка несовпадения email (wrong-email)
   */
  async expectWrongEmailMode() {
    // Проверяем наличие метки "Для:" и информации о текущем пользователе
    await expect(this.page.locator("text=Для:").first()).toBeVisible();
    await expect(this.page.locator("text=Вы вошли как").first()).toBeVisible();
    // Должна быть кнопка выхода
    await expect(
      this.page.locator('button:has-text("Выйти"), a:has-text("Выйти")').first(),
    ).toBeVisible();
  }

  /**
   * Проверяет состояние загрузки
   */
  async expectLoadingState() {
    // Ожидаем, что на странице есть индикатор загрузки или текст загрузки
    await expect(this.page.locator("text=Загрузка")).toBeVisible();
  }

  /**
   * Заполняет форму регистрации
   */
  async fillRegistrationForm(user: TestUser) {
    // Ищем поля по разным возможным селекторам
    const nameInput = this.page
      .locator('input[name="name"], input[name="givenName"], #name')
      .first();
    const emailInput = this.page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = this.page
      .locator('input[type="password"], [data-testid="password-input"]')
      .first();

    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(user.givenName);
    }
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(user.email);
    }
    await passwordInput.fill(user.password);
  }

  /**
   * Заполняет форму создания пароля
   */
  async fillPasswordForm(password: string) {
    const passwordInput = this.page.locator('input[type="password"]').first();
    await passwordInput.fill(password);
  }

  /**
   * Нажимает кнопку присоединения
   */
  async clickJoinButton() {
    const joinButton = this.page
      .locator(
        'button:has-text("Присоединиться"), button:has-text("Вступить"), button:has-text("Принять"), button[type="submit"]',
      )
      .first();
    await joinButton.click();
  }

  /**
   * Нажимает кнопку входа
   */
  async clickLoginButton() {
    const loginButton = this.page
      .locator('button:has-text("Войти"), a:has-text("Войти"), button[type="submit"]')
      .first();
    await loginButton.click();
  }

  /**
   * Проверяет редирект после успешного принятия приглашения
   */
  async expectRedirectToWorkspace(workspaceId: string) {
    await this.page.waitForURL(`**/?workspace=${workspaceId}**`, { timeout: 10000 });
  }

  /**
   * Проверяет редирект на страницу входа после принятия приглашения новым пользователем
   */
  async expectRedirectToSignIn(email: string) {
    await this.page.waitForURL(
      `**/auth/signin?message=invite_accepted&email=${encodeURIComponent(email)}**`,
      { timeout: 10000 },
    );
  }

  /**
   * Проверяет, что приглашение истекло
   */
  async expectExpiredInvitation() {
    // Проверяем наличие контейнера ошибки или заголовка ошибки
    await expect(this.page.locator('[role="alert"], [role="heading"]').first()).toBeVisible();
    // Проверяем текст об истечении приглашения (любой из вариантов)
    await expect(
      this.page
        .locator("text=истекло")
        .or(this.page.locator("text=просрочено"))
        .or(this.page.locator("text=истек"))
        .first(),
    ).toBeVisible();
  }

  /**
   * Проверяет, что приглашение не найдено
   */
  async expectInvalidInvitation() {
    await expect(this.page.locator("text=не найдено")).toBeVisible();
    await expect(this.page.locator("text=недействительно")).toBeVisible();
  }
}

/**
 * Фабрика тестовых данных для приглашений
 */
export class InvitationFactory {
  static createEmailInvitation(overrides: Partial<InvitationData> = {}): InvitationData {
    return {
      token: `invite-${Date.now()}`,
      email: "invited@example.com",
      workspaceId: `ws-${Date.now()}`,
      workspaceName: "Test Workspace",
      role: "member",
      userExists: false,
      requiresPassword: true,
      invitationType: "email",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    };
  }

  static createLinkInvitation(overrides: Partial<InvitationData> = {}): InvitationData {
    return {
      token: `link-${Date.now()}`,
      email: null,
      workspaceId: `ws-${Date.now()}`,
      workspaceName: "Test Workspace",
      role: "member",
      userExists: false,
      requiresPassword: true,
      invitationType: "link",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    };
  }

  static createExistingUserInvitation(overrides: Partial<InvitationData> = {}): InvitationData {
    return {
      token: `invite-existing-${Date.now()}`,
      email: "existing@example.com",
      workspaceId: `ws-${Date.now()}`,
      workspaceName: "Test Workspace",
      role: "member",
      userExists: true,
      requiresPassword: false,
      invitationType: "email",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    };
  }

  static createMockUser(overrides: Partial<MockUser> = {}): MockUser {
    return {
      id: `user-${Date.now()}`,
      email: "user@example.com",
      name: "Test User",
      hasPassword: true,
      ...overrides,
    };
  }
}
