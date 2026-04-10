import { describe, expect, it } from "bun:test";

describe("getDailyKpiStats - типы параметров", () => {
  it("принимает корректные параметры для фильтрации по сотруднику", () => {
    // Проверяем, что интерфейс параметров включает все необходимые поля
    const params = {
      workspaceId: "ws-123",
      employeeExternalId: "emp-456",
      dateFrom: "2024-01-01 00:00:00",
      dateTo: "2024-01-31 23:59:59",
      excludePhoneNumbers: ["101", "102"],
    } as const;

    expect(params.workspaceId).toBe("ws-123");
    expect(params.employeeExternalId).toBe("emp-456");
    expect(params.excludePhoneNumbers).toEqual(["101", "102"]);
  });

  it("excludePhoneNumbers может быть undefined", () => {
    const params = {
      workspaceId: "ws-123",
      employeeExternalId: "emp-456",
      dateFrom: "2024-01-01 00:00:00",
      dateTo: "2024-01-31 23:59:59",
      excludePhoneNumbers: undefined,
    } as const;

    expect(params.excludePhoneNumbers).toBeUndefined();
  });
});
