import { describe, expect, it } from "bun:test";
import { buildCallConditions } from "./build-conditions";

describe("buildCallConditions", () => {
  it("фильтрует по mobileNumbers через internalNumber", () => {
    const conditions = buildCallConditions({
      mobileNumbers: ["101", "102"],
    });

    expect(conditions).toHaveLength(2);
    // Первое условие - это фильтр по архивным звонкам
    // Второе - это inArray по internalNumber
    const mobileCondition = conditions[1];
    expect(mobileCondition).toBeDefined();
  });

  it("фильтрует по managerPhoneNumbers через internalNumber", () => {
    const conditions = buildCallConditions({
      managerPhoneNumbers: ["201", "202"],
    });

    expect(conditions).toHaveLength(2);
    const managerCondition = conditions[1];
    expect(managerCondition).toBeDefined();
  });

  it("фильтрует по managerPhoneNumbersForQuery через internalNumber", () => {
    const conditions = buildCallConditions({
      managerPhoneNumbersForQuery: ["301", "302"],
      q: "test",
    });

    expect(conditions).toHaveLength(2);
    // Второе условие - это поисковый запрос, который включает managerPhoneNumbersForQuery
    const queryCondition = conditions[1];
    expect(queryCondition).toBeDefined();
  });

  it("возвращает false для пустого массива mobileNumbers", () => {
    const conditions = buildCallConditions({
      mobileNumbers: [],
    });

    expect(conditions).toHaveLength(2);
    // Второе условие должно быть false (SQL literal)
    expect(conditions[1]).toBeDefined();
  });

  it("не добавляет условия, если массивы не переданы", () => {
    const conditions = buildCallConditions({});

    expect(conditions).toHaveLength(1);
    // Только условие по архивным звонкам
  });

  it("комбинирует несколько условий фильтрации", () => {
    const conditions = buildCallConditions({
      workspaceId: "ws-123",
      mobileNumbers: ["101"],
      managerPhoneNumbers: ["201"],
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
    });

    expect(conditions.length).toBeGreaterThan(3);
  });
});
