import { expect, test } from "@playwright/test";
import { InvitationFactory, InvitationHelpers } from "../../helpers/invitation-helpers.optimized";

/**
 * ОПТИМИЗИРОВАННЫЕ E2E тесты для управления приглашениями
 * 
 * Улучшения производительности:
 * - Переиспользование состояния через beforeEach
 * - Батчинг API моков
 * - Использование data-testid
 * - Параллельное выполнение
 * - Уменьшенные таймауты
 */
test.describe("Управление приглашениями (оптимизировано)", () => {
  let helpers: InvitationHelpers;
  let currentUser: ReturnType<typeof InvitationFactory.createMockUser>;

  // Настраиваем общее состояние один раз для всех тестов
  test.beforeEach(async ({ page }) => {
    helpers = new InvitationHelpers(page);
    currentUser = InvitationFactory.createMockUser({
      email: "admin@example.com",
      hasPassword: true,
    });

    // Настраиваем базовые моки один раз
    await helpers.setupBasicMocks(currentUser);
    
    // Переходим на страницу один раз
    await helpers.gotoUsersPage();
  });

  test.describe("Создание приглашений", () => {
    test("создает email-приглашение", async () => {
      const invitation = InvitationFactory.createEmailInvitation();
      await helpers.mockCreateInvitation(invitation);

      await helpers.openInviteModal();
      await helpers.fillInviteForm(invitation.email!, "member");
      await helpers.submitForm();
      
      await helpers.expectSuccess("Приглашение отправлено");
    });

    test("создает ссылку-приглашение", async ({ page }) => {
      const invitation = InvitationFactory.createLinkInvitation();
      await helpers.mockCreateInvitation(invitation);

      await helpers.openInviteModal();
      
      // Переключаемся на режим ссылки
      await page.locator('[data-testid="link-tab"], button:has-text("Ссылка")').first().click();
      await page.locator('[data-testid="role-select"]').selectOption("admin");
      await page.locator('[data-testid="create-link-button"]').click();

      await expect(page.locator('[data-testid="invite-link"]')).toBeVisible();
    });

    test("показывает ошибку для существующего члена команды", async () => {
      await helpers.mockCreateInvitationError("Пользователь уже является участником");

      await helpers.openInviteModal();
      await helpers.fillInviteForm("existing@example.com", "member");
      await helpers.submitForm();
      
      await helpers.expectError("уже является участником");
    });

    test("показывает ошибку для неправильного email", async ({ page }) => {
      await helpers.openInviteModal();
      
      await page.locator('[data-testid="email-input"]').fill("not-an-email");
      await helpers.submitForm();
      
      await helpers.expectError("корректный email");
    });
  });

  test.describe("Список приглашений", () => {
    test("отображает список активных приглашений", async ({ page }) => {
      const invitations = [
        InvitationFactory.createEmailInvitation({ email: "user1@example.com" }),
        InvitationFactory.createEmailInvitation({ email: "user2@example.com" }),
        InvitationFactory.createLinkInvitation(),
      ];

      await helpers.mockListInvitations(invitations);
      await helpers.gotoUsersPage();

      // Проверяем количество приглашений
      const inviteItems = page.locator('[data-testid="invitation-item"]');
      await expect(inviteItems).toHaveCount(3);
    });

    test("показывает информацию о каждом приглашении", async ({ page }) => {
      const invitation = InvitationFactory.createEmailInvitation({
        email: "pending@example.com",
        role: "admin",
      });

      await helpers.mockListInvitations([invitation]);
      await helpers.gotoUsersPage();

      const item = page.locator('[data-testid="invitation-item"]').first();
      await expect(item.locator('[data-testid="invitation-email"]')).toHaveText("pending@example.com");
      await expect(item.locator('[data-testid="invitation-role"]')).toContainText("admin");
    });

    test("показывает пустое состояние когда нет приглашений", async ({ page }) => {
      await helpers.mockListInvitations([]);
      await helpers.gotoUsersPage();

      await expect(page.locator('[data-testid="empty-invitations"]')).toBeVisible();
    });
  });

  test.describe("Отзыв приглашений", () => {
    test("отменяет приглашение", async ({ page }) => {
      const invitation = InvitationFactory.createEmailInvitation();
      await helpers.mockListInvitations([invitation]);

      await page.route("**/api/orpc/**", async (route) => {
        const request = route.request();
        const body = await request.postData();
        
        if (body && body.includes("revokeInvitation")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ result: { data: { success: true } } }),
          });
        } else {
          await route.continue();
        }
      });

      await helpers.gotoUsersPage();

      await page.locator('[data-testid="revoke-invitation-button"]').first().click();
      await page.locator('[data-testid="confirm-revoke-button"]').click();

      await helpers.expectSuccess("Приглашение отменено");
    });
  });

  test.describe("Копирование ссылки", () => {
    test("копирует ссылку-приглашение", async ({ page, context }) => {
      const invitation = InvitationFactory.createLinkInvitation();
      await helpers.mockListInvitations([invitation]);
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      await helpers.gotoUsersPage();

      await page.locator('[data-testid="copy-link-button"]').first().click();
      await helpers.expectSuccess("Скопировано");
    });
  });

  // Группируем тесты ролей для параллельного выполнения
  test.describe.parallel("Роли в приглашениях", () => {
    const roles: Array<"admin" | "member"> = ["admin", "member"];
    
    for (const role of roles) {
      test(`создает приглашение с ролью ${role}`, async ({ page }) => {
        const invitation = InvitationFactory.createEmailInvitation({ role });
        
        let capturedRole: string | null = null;
        await page.route("**/api/orpc/**", async (route) => {
          const request = route.request();
          const body = await request.postData();
          
          if (body && body.includes("createInvitation")) {
            const postData = JSON.parse(body);
            capturedRole = postData.role;
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

        await helpers.openInviteModal();
        await helpers.fillInviteForm(`${role}@example.com`, role);
        await helpers.submitForm();
        
        // Wait for the network request to complete
        await page.waitForResponse((response) => 
          response.url().includes('/createInvitation') && response.status() === 200
        );

        expect(capturedRole).toBe(role);
      });
    }
  });
});
