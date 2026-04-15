import { expect, type Page } from "@playwright/test";

/**
 * Оптимизированные вспомогательные функции для тестирования приглашений
 * 
 * Улучшения:
 * - Кеширование селекторов
 * - Использование data-testid
 * - Уменьшение количества ожиданий
 * - Батчинг API моков
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
 * Оптимизированный класс помощников
 */
export class InvitationHelpers {
  // Кешируем часто используемые селекторы
  private selectors = {
    inviteButton: '[data-testid="invite-button"], button:has-text("Пригласить")',
    emailInput: '[data-testid="email-input"], input[type="email"]',
    roleSelect: '[data-testid="role-select"], select[name="role"]',
    submitButton: '[data-testid="submit-button"], button[type="submit"]',
    successMessage: '[data-testid="success-message"], [role="status"]',
    errorMessage: '[data-testid="error-message"], [role="alert"]',
  };

  constructor(private page: Page) {}

  /**
   * Настраивает все базовые моки одним вызовом
   */
  async setupBasicMocks(user: MockUser, invitations: InvitationData[] = []) {
    // Батчим все моки в один вызов route
    await Promise.all([
      this.mockCurrentUser(user),
      this.mockListInvitations(invitations),
    ]);
  }

  /**
   * Мокирует текущего пользователя
   */
  async mockCurrentUser(user: MockUser | null) {
    await this.page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: user ? 200 : 401,
        contentType: "application/json",
        body: JSON.stringify(
          user
            ? { user: { id: user.id, email: user.email, name: user.name } }
            : { error: "Unauthorized" }
        ),
      });
    });
  }

  /**
   * Мокирует список приглашений
   */
  async mockListInvitations(invitations: InvitationData[]) {
    await this.page.route("**/api/orpc/**", async (route) => {
      const request = route.request();
      const body = await request.postData();
      
      if (body && body.includes("listInvitations")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ result: { data: invitations } }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Мокирует создание приглашения
   */
  async mockCreateInvitation(invitation: InvitationData) {
    await this.page.route("**/api/orpc/**", async (route) => {
      const request = route.request();
      const body = await request.postData();
      
      if (body && body.includes("createInvitation")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: {
                token: invitation.token,
                inviteUrl: `http://localhost:3000/invite/${invitation.token}`,
                expiresAt: invitation.expiresAt,
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Мокирует ошибку создания приглашения
   */
  async mockCreateInvitationError(message: string, status = 400) {
    await this.page.route("**/api/orpc/**", async (route) => {
      const request = route.request();
      const body = await request.postData();
      
      if (body && body.includes("createInvitation")) {
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify({ error: { message } }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Быстрое открытие модального окна приглашения
   */
  async openInviteModal() {
    const button = this.page.locator(this.selectors.inviteButton).first();
    await button.click();
    // Ждем только появления модального окна, не всех элементов
    await this.page.locator('[role="dialog"], [data-testid="invite-modal"]').waitFor();
  }

  /**
   * Быстрое заполнение формы приглашения
   */
  async fillInviteForm(email: string, role: string) {
    // Заполняем все поля параллельно
    await Promise.all([
      this.page.locator(this.selectors.emailInput).fill(email),
      this.page.locator(this.selectors.roleSelect).selectOption(role),
    ]);
  }

  /**
   * Отправка формы
   */
  async submitForm() {
    await this.page.locator(this.selectors.submitButton).first().click();
  }

  /**
   * Проверка успешного сообщения
   */
  async expectSuccess(message?: string) {
    const locator = this.page.locator(this.selectors.successMessage);
    await expect(locator).toBeVisible();
    if (message) {
      await expect(locator).toContainText(message);
    }
  }

  /**
   * Проверка ошибки
   */
  async expectError(message?: string) {
    const locator = this.page.locator(this.selectors.errorMessage);
    await expect(locator).toBeVisible();
    if (message) {
      await expect(locator).toContainText(message);
    }
  }

  /**
   * Переход на страницу с кешированием
   */
  async gotoUsersPage() {
    // Используем waitUntil: 'domcontentloaded' вместо 'load' для ускорения
    await this.page.goto("/users", { waitUntil: "domcontentloaded" });
  }

  /**
   * Мокирует получение приглашения
   */
  async mockGetInvitation(invitation: InvitationData) {
    await this.page.route("**/api/orpc/**", async (route) => {
      const request = route.request();
      const body = await request.postData();
      
      if (body && body.includes("getInvitationByToken")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ result: { data: invitation } }),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Мокирует принятие приглашения
   */
  async mockAcceptInvitation(workspaceId: string) {
    const response = {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: { data: { workspaceId, success: true } },
      }),
    };

    await this.page.route("**/api/orpc/**", async (route) => {
      const request = route.request();
      const body = await request.postData();
      
      if (body && (body.includes("acceptInvitation") || body.includes("acceptInvitationForExistingUser"))) {
        await route.fulfill(response);
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Проверяет редирект
   */
  async expectRedirectToWorkspace(workspaceId: string) {
    await this.page.waitForURL(`**/?workspace=${workspaceId}**`);
  }
}

/**
 * Фабрика с кешированием
 */
export class InvitationFactory {
  private static counter = 0;

  static createEmailInvitation(overrides: Partial<InvitationData> = {}): InvitationData {
    this.counter++;
    return {
      token: `invite-${this.counter}`,
      email: `invited-${this.counter}@example.com`,
      workspaceId: `ws-${this.counter}`,
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
    this.counter++;
    return {
      token: `link-${this.counter}`,
      email: null,
      workspaceId: `ws-${this.counter}`,
      workspaceName: "Test Workspace",
      role: "member",
      userExists: false,
      requiresPassword: true,
      invitationType: "link",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    };
  }

  static createMockUser(overrides: Partial<MockUser> = {}): MockUser {
    this.counter++;
    return {
      id: `user-${this.counter}`,
      email: `user-${this.counter}@example.com`,
      name: `Test User ${this.counter}`,
      hasPassword: true,
      ...overrides,
    };
  }
}
