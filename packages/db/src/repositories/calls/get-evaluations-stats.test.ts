import { describe, expect, it } from "bun:test";

describe("getEvaluationsStats - типы параметров", () => {
  it("принимает internalNumbers для фильтрации по внутренним номерам", () => {
    const params = {
      workspaceId: "ws-123",
      dateFrom: "2024-01-01",
      dateTo: "2024-01-31",
      excludePhoneNumbers: ["999"],
      internalNumbers: ["101", "102", "103"],
    } as const;

    expect(params.internalNumbers).toEqual(["101", "102", "103"]);
    expect(params.excludePhoneNumbers).toEqual(["999"]);
  });

  it("internalNumbers может быть undefined", () => {
    const params = {
      workspaceId: "ws-123",
      dateFrom: "2024-01-01",
      dateTo: "2024-01-31",
      excludePhoneNumbers: undefined,
      internalNumbers: undefined,
    } as const;

    expect(params.internalNumbers).toBeUndefined();
    expect(params.excludePhoneNumbers).toBeUndefined();
  });
});

describe("getLowRatedCallsCount - типы параметров", () => {
  it("принимает internalNumbers для фильтрации по внутренним номерам", () => {
    const params = {
      workspaceId: "ws-123",
      dateFrom: "2024-01-01",
      dateTo: "2024-01-31",
      excludePhoneNumbers: ["999"],
      internalNumbers: ["201", "202"],
      maxScore: 3,
    } as const;

    expect(params.internalNumbers).toEqual(["201", "202"]);
    expect(params.maxScore).toBe(3);
  });
});
