import { expect, test } from "@playwright/test";
import { InvitationFactory, InvitationHelpers } from "../../helpers/invitation-helpers";

/**
 * E2E тесты для управления приглашениями (создание, отзыв, просмотр)
 * Требуют авторизации и доступа к рабочему пространству
 */
test.describe("Управление приглашениями в рабочем пространстве", () => {
  let helpers: InvitationHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new InvitationHelpers(page);
  });

  test.describe("Создание приглашений", () => {
    test("открывает модальное окно создания приглашения", async ({ page }) => {
      // Мокируем авторизованного пользователя
      const currentUser = InvitationFactory.createMockUser({
        email: "admin@example.com",
        hasPassword: true,
      });
      await helpers.mockCurrentUser(currentUser);

      // Переходим на страницу управления пользователями
      await page.goto("/users");

      // Кликаем на кнопку приглашения
      const inviteButton = page
        .locator(
          'button:has-text("Пригласить"), button:has-text("Добавить"), [data-testid="invite-button"]',
        )
        .first();
      await expect(inviteButton).toBeVisible();
      await inviteButton.click();

      // Проверяем, что модальное окно открылось
      await expect(page.locator("text=Пригласить пользователя")).toBeVisible();
    });

    test("создает email-приглашение", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      // Мокируем создание приглашения
      const invitation = InvitationFactory.createEmailInvitation({
        email: "newmember@example.com",
      });

      await page.route("**/api/orpc/workspaces/createInvitation**", async (route) => {
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
      });

      await page.goto("/users");

      const inviteButton = page.locator('button:has-text("Пригласить")').first();
      await expect(inviteButton).toBeVisible();
      await inviteButton.click();

      // Заполняем форму
      await page.fill('input[type="email"]', "newmember@example.com");
      await page.selectOption('select[name="role"]', "member");

      // Отправляем
      const submitButton = page
        .locator('button[type="submit"]:has-text("Отправить"), button:has-text("Пригласить")')
        .first();
      await submitButton.click();

      // Проверяем успех
      await expect(page.locator("text=Приглашение отправлено")).toBeVisible();
    });

    test("создает ссылку-приглашение", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      const invitation = InvitationFactory.createLinkInvitation();

      await page.route("**/api/orpc/workspaces/createInvitation**", async (route) => {
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
      });

      await page.goto("/users");

      const inviteButton = page.locator('button:has-text("Пригласить")').first();
      await expect(inviteButton).toBeVisible();
      await inviteButton.click();

      // Переключаемся на режим ссылки
      const linkTab = page
        .locator('button:has-text("Ссылка"), [role="tab"]:has-text("Ссылка")')
        .first();
      await expect(linkTab).toBeVisible();
      await linkTab.click();

      // Выбираем роль
      await page.selectOption('select[name="role"]', "admin");

      // Создаем ссылку
      const createButton = page.locator('button:has-text("Создать ссылку")').first();
      await createButton.click();

      // Проверяем, что ссылка отображается
      await expect(page.locator("text=Ссылка-приглашение")).toBeVisible();
      await expect(page.locator(`text=${invitation.token}`)).toBeVisible();
    });

    test("показывает ошибку для существующего члена команды", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      await page.route("**/api/orpc/workspaces/createInvitation**", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: { message: "Пользователь уже является участником рабочего пространства" },
          }),
        });
      });

      await page.goto("/users");

      const inviteButton = page.locator('button:has-text("Пригласить")').first();
      await expect(inviteButton).toBeVisible();
      await inviteButton.click();

      await page.fill('input[type="email"]', "existing@example.com");
      await page.locator('button[type="submit"]').first().click();

      await expect(page.locator("text=уже является участником")).toBeVisible();
    });

    test("показывает ошибку для неправильного email", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      await page.goto("/users");

      const inviteButton = page.locator('button:has-text("Пригласить")').first();
      await expect(inviteButton).toBeVisible();
      await inviteButton.click();

      // Вводим невалидный email
      await page.fill('input[type="email"]', "not-an-email");
      await page.locator('button[type="submit"]').first().click();

      // Проверяем ошибку валидации
      await expect(page.locator("text=корректный email")).toBeVisible();
    });
  });

  test.describe("Список приглашений", () => {
    test("отображает список активных приглашений", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      // Мокируем список приглашений
      const invitations = [
        InvitationFactory.createEmailInvitation({ email: "user1@example.com" }),
        InvitationFactory.createEmailInvitation({ email: "user2@example.com" }),
        InvitationFactory.createLinkInvitation(),
      ];

      await page.route("**/api/orpc/workspaces/listInvitations**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: invitations,
            },
          }),
        });
      });

      await page.goto("/users");

      // Проверяем, что приглашения отображаются
      await expect(page.locator("text=Ожидают").or(page.locator("text=Приглашения"))).toBeVisible();
    });

    test("показывает информацию о каждом приглашении", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      const invitation = InvitationFactory.createEmailInvitation({
        email: "pending@example.com",
        role: "admin",
      });

      await page.route("**/api/orpc/workspaces/listInvitations**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: [invitation],
            },
          }),
        });
      });

      await page.goto("/users");

      // Проверяем детали приглашения
      await expect(page.locator("text=pending@example.com")).toBeVisible();
      await expect(page.locator("text=admin").or(page.locator("text=Администратор"))).toBeVisible();
    });

    test("показывает пустое состояние когда нет приглашений", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      await page.route("**/api/orpc/workspaces/listInvitations**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: [],
            },
          }),
        });
      });

      await page.goto("/users");

      await expect(
        page.locator("text=Нет приглашений").or(page.locator("text=Ожидают: 0")),
      ).toBeVisible();
    });
  });

  test.describe("Отзыв приглашений", () => {
    test("отменяет приглашение", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      const invitation = InvitationFactory.createEmailInvitation({
        email: "tocancel@example.com",
      });

      await page.route("**/api/orpc/workspaces/listInvitations**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: [invitation],
            },
          }),
        });
      });

      await page.route("**/api/orpc/workspaces/revokeInvitation**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: { success: true },
            },
          }),
        });
      });

      await page.goto("/users");

      // Находим кнопку отзыва
      const revokeButton = page
        .locator('button:has-text("Отменить"), button[aria-label="Отменить приглашение"]')
        .first();
      await expect(revokeButton).toBeVisible();
      await revokeButton.click();

      // Подтверждаем отмену
      const confirmButton = page
        .locator('button:has-text("Да"), button:has-text("Отменить приглашение")')
        .first();
      await confirmButton.click();

      await expect(page.locator("text=Приглашение отменено")).toBeVisible();
    });

    test("показывает ошибку при отзыве несуществующего приглашения", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      await page.route("**/api/orpc/workspaces/revokeInvitation**", async (route) => {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            error: { message: "Приглашение не найдено" },
          }),
        });
      });

      await page.goto("/users");

      const revokeButton = page.locator('button:has-text("Отменить")').first();
      await expect(revokeButton).toBeVisible();
      await revokeButton.click();

      await expect(page.locator("text=не найдено")).toBeVisible();
  });

  test.describe("Копирование ссылки приглашения", () => {
    test("копирует ссылку-приглашение в буфер обмена", async ({ page, context }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      const invitation = InvitationFactory.createLinkInvitation();

      await page.route("**/api/orpc/workspaces/listInvitations**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: [invitation],
            },
          }),
        });
      });

      // Даем разрешение на доступ к буферу обмена
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      await page.goto("/users");

      const copyButton = page
        .locator('button:has-text("Копировать"), [data-testid="copy-link"]')
        .first();
      await expect(copyButton).toBeVisible();
      await copyButton.click();

      // Проверяем уведомление об успешном копировании
      await expect(
        page.locator("text=Ссылка скопирована").or(page.locator("text=Скопировано")),
      ).toBeVisible();
    });
  });

  test.describe("Права доступа", () => {
    test("не позволяет создавать приглашения без прав администратора", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      await page.route("**/api/orpc/workspaces/createInvitation**", async (route) => {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            error: { message: "Недостаточно прав" },
          }),
        });
      });

      await page.goto("/users");

      const inviteButton = page.locator('button:has-text("Пригласить")').first();
      await expect(inviteButton).toBeVisible();
      await inviteButton.click();
      await page.fill('input[type="email"]', "test@example.com");
      await page.locator('button[type="submit"]').first().click();

      await expect(page.locator("text=Недостаточно прав")).toBeVisible();
    });

    test("показывает только просмотр для обычных участников", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      await page.goto("/users");

      // Обычные участники не видят кнопку приглашения
      const inviteButton = page.locator('button:has-text("Пригласить")');
      await expect(inviteButton).not.toBeVisible();
    });
  });

  test.describe("Срок действия приглашений", () => {
    test("показывает оставшееся время действия", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 дня
      const invitation = InvitationFactory.createEmailInvitation({
        expiresAt: expiresAt.toISOString(),
      });

      await page.route("**/api/orpc/workspaces/listInvitations**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: [invitation],
            },
          }),
        });
      });

      await page.goto("/users");

      // Проверяем отображение времени
      await expect(
        page
          .locator("text=дня")
          .or(page.locator("text=осталось"))
          .or(page.locator("text=истекает")),
      ).toBeVisible();
    });

    test("помечает истекшие приглашения", async ({ page }) => {
      const currentUser = InvitationFactory.createMockUser();
      await helpers.mockCurrentUser(currentUser);

      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Вчера
      const invitation = InvitationFactory.createEmailInvitation({
        expiresAt: expiredDate.toISOString(),
      });

      await page.route("**/api/orpc/workspaces/listInvitations**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            result: {
              data: [invitation],
            },
          }),
        });
      });

      await page.goto("/users");

      await expect(page.locator("text=Истекло").or(page.locator("text=Просрочено"))).toBeVisible();
    });
  });

  test.describe("Роли в приглашениях", () => {
    const roles: Array<{ role: string; label: string }> = [
      { role: "admin", label: "Администратор" },
      { role: "member", label: "Участник" },
    ];

    for (const { role, label } of roles) {
      test(`может создать приглашение с ролью ${label}`, async ({ page }) => {
        const currentUser = InvitationFactory.createMockUser();
        await helpers.mockCurrentUser(currentUser);

        const invitation = InvitationFactory.createEmailInvitation({
          role: role as "admin" | "member",
          email: `${role}@example.com`,
        });

        let capturedRole: string | null = null;

        await page.route("**/api/orpc/workspaces/createInvitation**", async (route) => {
          const postData = route.request().postData();
          if (postData) {
            const body = JSON.parse(postData);
            capturedRole = body.role;
          }
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
        });

        await page.goto("/users");

        const inviteButton = page.locator('button:has-text("Пригласить")').first();
        await expect(inviteButton).toBeVisible();
        await inviteButton.click();

        await page.fill('input[type="email"]', `${role}@example.com`);
        await page.selectOption('select[name="role"]', role);
        await page.locator('button[type="submit"]').first().click();

        // Проверяем, что правильная роль была отправлена
        expect(capturedRole).toBe(role);
      });
    }
  });
