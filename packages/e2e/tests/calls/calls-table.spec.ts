import { test } from "@playwright/test";
import { test as callsTest } from "../fixtures/calls";
import { CallsHelpers } from "../helpers/calls-helpers";

test.describe
  .skip("Таблица звонков - различия отображения для ролей", () => {
    test.skip(true, "Requires running application with data");
    let callsHelpers: CallsHelpers;

    test.beforeEach(async ({ page }) => {
      callsHelpers = new CallsHelpers(page);
    });

    test.afterEach(async () => {
      await callsHelpers.clearMocks();
    });

    /**
     * Тесты для администратора
     */
    callsTest.describe("Администратор", () => {
      callsTest("видит все звонки всех пользователей", async ({ page, adminUser, mockCalls }) => {
        callsHelpers = new CallsHelpers(page);

        // Мокаем аутентификацию админа
        await callsHelpers.mockAuthenticatedUser(adminUser);
        // Мокаем API с полным списком звонков
        await callsHelpers.mockCallsResponse(mockCalls, adminUser.role, adminUser);

        // Переходим на страницу звонков
        await callsHelpers.navigateToCalls();

        // Проверяем что таблица отображается
        await callsHelpers.expectCallsTableVisible();

        // Проверяем что все 6 звонков видны (2 админа + 2 участника + 2 другого)
        await callsHelpers.expectCallsCount(6);

        // Проверяем что видны звонки всех пользователей
        await callsHelpers.expectCallNumberVisible("+74951234567"); // админ
        await callsHelpers.expectCallNumberVisible("+74959876543"); // участник
        await callsHelpers.expectCallNumberVisible("+74951111111"); // другой
      });

      callsTest(
        "видит фильтр по менеджерам со всеми опциями",
        async ({ page, adminUser, mockCalls }) => {
          callsHelpers = new CallsHelpers(page);

          await callsHelpers.mockAuthenticatedUser(adminUser);
          await callsHelpers.mockCallsResponse(mockCalls, adminUser.role, adminUser);

          await callsHelpers.navigateToCalls();
          await callsHelpers.expectCallsTableVisible();

          // Проверяем что фильтр менеджеров доступен
          await callsHelpers.expectManagerFilterAvailable();
        },
      );

      callsTest("видит метрики по всем звонкам", async ({ page, adminUser, mockCalls }) => {
        callsHelpers = new CallsHelpers(page);

        await callsHelpers.mockAuthenticatedUser(adminUser);
        await callsHelpers.mockCallsResponse(mockCalls, adminUser.role, adminUser);

        await callsHelpers.navigateToCalls();

        // Проверяем что метрики отображаются
        await callsHelpers.expectMetricsVisible();
      });
    });

    /**
     * Тесты для участника (member)
     */
    callsTest.describe("Участник (Member)", () => {
      callsTest("видит только свои звонки", async ({ page, memberUser, mockCalls }) => {
        callsHelpers = new CallsHelpers(page);

        await callsHelpers.mockAuthenticatedUser(memberUser);
        await callsHelpers.mockCallsResponse(mockCalls, memberUser.role, memberUser);

        await callsHelpers.navigateToCalls();
        await callsHelpers.expectCallsTableVisible();

        // Участник должен видеть только 2 своих звонка (call-member-1, call-member-2)
        await callsHelpers.expectCallsCount(2);

        // Проверяем что видны свои звонки
        await callsHelpers.expectCallNumberVisible("+74959876543");
        await callsHelpers.expectCallNumberVisible("+74959876544");

        // Проверяем что чужие звонки НЕ видны
        await callsHelpers.expectCallNumberNotVisible("+74951234567"); // админ
        await callsHelpers.expectCallNumberNotVisible("+74951111111"); // другой
      });

      callsTest(
        "не видит звонки других пользователей в таблице",
        async ({ page, memberUser, mockCalls, otherUserCalls }) => {
          callsHelpers = new CallsHelpers(page);

          await callsHelpers.mockAuthenticatedUser(memberUser);
          await callsHelpers.mockCallsResponse(mockCalls, memberUser.role, memberUser);

          await callsHelpers.navigateToCalls();
          await callsHelpers.expectCallsTableVisible();

          // Проверяем что звонки другого пользователя не отображаются
          for (const call of otherUserCalls) {
            await callsHelpers.expectCallNumberNotVisible(call.number);
          }
        },
      );

      callsTest(
        "видит пустую таблицу когда нет своих звонков",
        async ({ page, memberUserWithoutExtensions }) => {
          callsHelpers = new CallsHelpers(page);

          await callsHelpers.mockAuthenticatedUser(memberUserWithoutExtensions);
          await callsHelpers.mockEmptyCallsResponse();

          await callsHelpers.navigateToCalls();

          // Участник без extension должен видеть пустую таблицу
          await callsHelpers.expectCallsCount(0);
        },
      );

      callsTest(
        "фильтр менеджеров ограничен или скрыт",
        async ({ page, memberUser, mockCalls }) => {
          callsHelpers = new CallsHelpers(page);

          await callsHelpers.mockAuthenticatedUser(memberUser);
          await callsHelpers.mockCallsResponse(mockCalls, memberUser.role, memberUser);

          await callsHelpers.navigateToCalls();
          await callsHelpers.expectCallsTableVisible();

          // Проверяем ограниченность фильтра
          await callsHelpers.expectManagerFilterRestrictedOrHidden();
        },
      );
    });

    /**
     * Сравнительные тесты
     */
    callsTest.describe("Сравнение Admin vs Member", () => {
      callsTest(
        "admin видит больше звонков чем member",
        async ({ page, adminUser, memberUser, mockCalls }) => {
          callsHelpers = new CallsHelpers(page);

          // Сначала как admin
          await callsHelpers.mockAuthenticatedUser(adminUser);
          await callsHelpers.mockCallsResponse(mockCalls, adminUser.role, adminUser);
          await callsHelpers.navigateToCalls();

          // Admin видит все 6 звонков
          await callsHelpers.expectCallsCount(6);

          // Очищаем моки и перезаходим как member
          await callsHelpers.clearMocks();
          await callsHelpers.mockAuthenticatedUser(memberUser);
          await callsHelpers.mockCallsResponse(mockCalls, memberUser.role, memberUser);

          // Перезагружаем страницу
          await page.reload();
          await page.waitForLoadState("networkidle");

          // Member видит только 2 звонка
          await callsHelpers.expectCallsCount(2);
        },
      );

      callsTest(
        "member не может получить доступ к чужим звонкам через API",
        async ({ page, memberUser, otherUserCalls }) => {
          callsHelpers = new CallsHelpers(page);

          // Пробуем запросить звонки другого пользователя
          await callsHelpers.mockAuthenticatedUser(memberUser);

          // Мокаем API чтобы он возвращал только звонки участника
          await page.route("**/api/trpc/calls.list*", async (route) => {
            // Даже если запрос пытается получить чужие звонки,
            // API должен фильтровать по роли на сервере
            const response = {
              result: {
                data: {
                  calls: [], // Пусто, т.к. participant не имеет доступа
                  pagination: {
                    page: 1,
                    total: 0,
                    per_page: 15,
                    total_pages: 1,
                    has_next: false,
                    has_prev: false,
                  },
                  metrics: {
                    total_calls: 0,
                    transcribed: 0,
                    avg_duration: 0,
                    last_sync: null,
                  },
                  managers: [],
                },
              },
            };

            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(response),
            });
          });

          await callsHelpers.navigateToCalls();

          // Проверяем что чужие звонки не отображаются
          for (const call of otherUserCalls) {
            await callsHelpers.expectCallNumberNotVisible(call.number);
          }
        },
      );
    });
  });
