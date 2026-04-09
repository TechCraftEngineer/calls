import { expect, type Page, type Route } from "@playwright/test";
import type { CallTestUser, MockCall, WorkspaceRole } from "../fixtures/calls";

/**
 * Параметры API ответа для звонков
 */
interface CallsApiResponse {
  calls: MockCallWithDetails[];
  pagination: {
    page: number;
    total: number;
    per_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  metrics: {
    total_calls: number;
    transcribed: number;
    avg_duration: number;
    last_sync: string | null;
  };
  managers: { id: string; name: string }[];
}

interface MockCallWithDetails {
  call: MockCall;
  transcript: {
    id: string;
    callType: string | null;
    callTopic: string | null;
    sentiment: string | null;
    summary: string | null;
  } | null;
  evaluation: {
    id: string;
    valueScore: number | null;
    valueExplanation: string | null;
    managerRecommendations: string[] | null;
  } | null;
}

/**
 * Вспомогательные функции для тестирования таблицы звонков
 */
export class CallsHelpers {
  constructor(private page: Page) {}

  /**
   * Мокает API ответ со списком звонков
   */
  async mockCallsResponse(
    calls: MockCall[],
    role: WorkspaceRole,
    currentUser: CallTestUser,
  ): Promise<void> {
    await this.page.route("**/api/trpc/calls.list*", async (route: Route) => {
      // Для участника фильтруем звонки
      const visibleCalls =
        role === "member"
          ? calls.filter((c) => {
              // Участник видит только свои звонки (по internalNumber или mobile)
              const hasMatchingExtension =
                currentUser.internalExtensions?.includes(c.internalNumber || "") ?? false;
              const hasMatchingPhone = currentUser.mobilePhones?.includes(c.number) ?? false;
              return hasMatchingExtension || hasMatchingPhone;
            })
          : calls; // Администратор видит все

      const response: CallsApiResponse = {
        calls: visibleCalls.map((c) => this.createCallWithDetails(c)),
        pagination: {
          page: 1,
          total: visibleCalls.length,
          per_page: 15,
          total_pages: Math.ceil(visibleCalls.length / 15) || 1,
          has_next: false,
          has_prev: false,
        },
        metrics: {
          total_calls: visibleCalls.length,
          transcribed: visibleCalls.filter((c) => c.duration && c.duration > 0).length,
          avg_duration:
            visibleCalls.reduce((sum, c) => sum + (c.duration || 0), 0) /
            (visibleCalls.length || 1),
          last_sync: new Date().toISOString(),
        },
        managers: this.extractManagers(visibleCalls, role, currentUser),
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result: { data: response } }),
      });
    });
  }

  /**
   * Мокает пустой ответ (нет звонков)
   */
  async mockEmptyCallsResponse(): Promise<void> {
    await this.page.route("**/api/trpc/calls.list*", async (route: Route) => {
      const response: CallsApiResponse = {
        calls: [],
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
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result: { data: response } }),
      });
    });
  }

  /**
   * Создает объект звонка с деталями
   */
  private createCallWithDetails(call: MockCall): MockCallWithDetails {
    return {
      call: {
        ...call,
        timestamp: call.timestamp,
      },
      transcript: call.duration
        ? {
            id: `transcript-${call.id}`,
            callType: "sale",
            callTopic: "Консультация",
            sentiment: "positive",
            summary: "Клиент заинтересован в продукте",
          }
        : null,
      evaluation: call.duration
        ? {
            id: `eval-${call.id}`,
            valueScore: 85,
            valueExplanation: "Хороший разговор",
            managerRecommendations: ["Улучшить приветствие"],
          }
        : null,
    };
  }

  /**
   * Извлекает список менеджеров из звонков
   */
  private extractManagers(
    calls: MockCall[],
    role: WorkspaceRole,
    currentUser: CallTestUser,
  ): { id: string; name: string }[] {
    const managersMap = new Map<string, string>();

    calls.forEach((call) => {
      if (call.managerId && call.managerName) {
        // Для участника показываем только себя
        if (role === "member" && call.managerId !== currentUser.id) {
          return;
        }
        managersMap.set(call.managerId, call.managerName);
      }
    });

    return Array.from(managersMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }

  /**
   * Мокает аутентификацию пользователя с указанной ролью
   */
  async mockAuthenticatedUser(user: CallTestUser): Promise<void> {
    await this.page.route("**/api/auth/**", async (route: Route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: user.id,
              email: user.email,
              name: `${user.givenName} ${user.familyName || ""}`.trim(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Мокаем информацию о workspace с ролью
    await this.page.route("**/api/trpc/workspaces.getCurrent*", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            data: {
              id: "test-workspace-id",
              name: "Test Workspace",
              role: user.role,
              settings: {
                internalExtensions: user.internalExtensions?.join(",") || null,
                mobilePhones: user.mobilePhones?.join(",") || null,
              },
            },
          },
        }),
      });
    });
  }

  /**
   * Переходит на страницу звонков
   */
  async navigateToCalls(): Promise<void> {
    await this.page.goto("/calls");
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Проверяет, что таблица звонков отображается
   */
  async expectCallsTableVisible(): Promise<void> {
    // Проверяем наличие таблицы или сообщения о пустом состоянии
    const tableOrEmpty = this.page.locator(
      "table, [data-testid='call-list-empty'], .op-empty-state, text=Нет звонков",
    );
    await expect(tableOrEmpty).toBeVisible();
  }

  /**
   * Проверяет количество строк в таблице звонков
   */
  async expectCallsCount(expectedCount: number): Promise<void> {
    if (expectedCount === 0) {
      // Проверяем сообщение о пустом состоянии
      await expect(
        this.page.locator(".op-empty-state, [data-testid='call-list-empty']").first(),
      ).toBeVisible();
    } else {
      // Проверяем количество строк (исключаем заголовок)
      const rows = this.page.locator("tbody tr, [data-testid='call-row']");
      await expect(rows).toHaveCount(expectedCount);
    }
  }

  /**
   * Проверяет, что звонок с указанным номером отображается в таблице
   */
  async expectCallNumberVisible(number: string): Promise<void> {
    await expect(this.page.locator(`text=${number}`)).toBeVisible();
  }

  /**
   * Проверяет, что звонок с указанным номером НЕ отображается
   */
  async expectCallNumberNotVisible(number: string): Promise<void> {
    await expect(this.page.locator(`text=${number}`)).not.toBeVisible();
  }

  /**
   * Проверяет, что фильтр менеджеров доступен (для админа)
   */
  async expectManagerFilterAvailable(): Promise<void> {
    const filter = this.page.locator(
      "[data-testid='manager-filter'], [placeholder*='менеджер'], button:has-text('Менеджер')",
    );
    await expect(filter.first()).toBeVisible();
  }

  /**
   * Проверяет, что фильтр менеджеров недоступен или ограничен (для участника)
   */
  async expectManagerFilterRestrictedOrHidden(): Promise<void> {
    // Для участника фильтр либо скрыт, либо показывает только текущего пользователя
    const filter = this.page.locator(
      "[data-testid='manager-filter'], [placeholder*='менеджер'], button:has-text('Менеджер')",
    );
    // Либо фильтра нет, либо он есть но с ограниченным выбором
    const count = await filter.count();
    if (count > 0) {
      // Если фильтр есть, проверяем что он ограничен
      await filter.first().click();
      // Проверяем что доступен только один вариант (текущий пользователь)
      const options = this.page.locator('[role="option"], [data-testid*="manager-option"]');
      await expect(options).toHaveCount(1);
    }
  }

  /**
   * Проверяет отображение метрик звонков
   */
  async expectMetricsVisible(): Promise<void> {
    await expect(
      this.page.locator("text=Всего звонков, [data-testid='calls-metrics']").first(),
    ).toBeVisible();
  }

  /**
   * Получает список номеров из таблицы звонков
   */
  async getVisibleCallNumbers(): Promise<string[]> {
    const cells = this.page.locator("[data-testid='call-number-cell']");
    const count = await cells.count();
    const numbers: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await cells.nth(i).textContent();
      if (text) numbers.push(text.trim());
    }
    return numbers;
  }

  /**
   * Очищает все моки маршрутов
   */
  async clearMocks(): Promise<void> {
    await this.page.unrouteAll();
  }
}
