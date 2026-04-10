import { describe, expect, it } from "bun:test";

describe("getCallsMetrics - типы параметров", () => {
  it("принимает mobileNumbers для фильтрации по внутренним номерам", () => {
    const params = {
      workspaceId: "ws-123",
      mobileNumbers: ["101", "102"],
      managerPhoneNumbers: ["201", "202"],
      managerPhoneNumbersForQuery: ["301", "302"],
      excludePhoneNumbers: ["999"],
    } as const;

    expect(params.mobileNumbers).toEqual(["101", "102"]);
    expect(params.managerPhoneNumbers).toEqual(["201", "202"]);
    expect(params.managerPhoneNumbersForQuery).toEqual(["301", "302"]);
  });

  it("все параметры фильтрации по номерам могут быть undefined", () => {
    const params = {
      workspaceId: "ws-123",
      mobileNumbers: undefined,
      managerPhoneNumbers: undefined,
      managerPhoneNumbersForQuery: undefined,
      excludePhoneNumbers: undefined,
    } as const;

    expect(params.mobileNumbers).toBeUndefined();
    expect(params.managerPhoneNumbers).toBeUndefined();
    expect(params.managerPhoneNumbersForQuery).toBeUndefined();
    expect(params.excludePhoneNumbers).toBeUndefined();
  });
});
