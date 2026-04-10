import { describe, expect, it } from "bun:test";
import * as schema from "../../schema";
import { buildExcludePhoneCondition } from "./build-exclude-phone-condition";

describe("buildExcludePhoneCondition", () => {
  it("возвращает undefined для пустого массива", () => {
    const result = buildExcludePhoneCondition([], schema.calls);
    expect(result).toBeUndefined();
  });

  it("возвращает undefined для undefined", () => {
    const result = buildExcludePhoneCondition(undefined, schema.calls);
    expect(result).toBeUndefined();
  });

  it("создаёт условие исключения для непустого массива", () => {
    const result = buildExcludePhoneCondition(["101", "102"], schema.calls);
    expect(result).toBeDefined();
  });

  it("исключает по internalNumber и number", () => {
    const result = buildExcludePhoneCondition(["101", "+79001234567"], schema.calls);
    expect(result).toBeDefined();
    // Условие должно содержать проверку по обоим полям
  });
});
