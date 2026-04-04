/** Unit tests for date range utility functions. */

import { describe, expect, it } from "bun:test";
import {
  type DateRange,
  deserializeDateRange,
  getQuickFilterDates,
  serializeDateRange,
} from "@/lib/date-range-utils";

describe("serializeDateRange", () => {
  it("should serialize date range to URL parameters", () => {
    const result = serializeDateRange("2024-01-15", "2024-01-31");
    expect(result).toEqual({
      startDate: "2024-01-15",
      endDate: "2024-01-31",
    });
  });

  it("should handle same start and end date", () => {
    const result = serializeDateRange("2024-01-15", "2024-01-15");
    expect(result).toEqual({
      startDate: "2024-01-15",
      endDate: "2024-01-15",
    });
  });
});

describe("deserializeDateRange", () => {
  it("should deserialize valid date range from URL parameters", () => {
    const params = {
      startDate: "2024-01-15",
      endDate: "2024-01-31",
    };
    const result = deserializeDateRange(params);
    expect(result).toEqual({
      startDate: "2024-01-15",
      endDate: "2024-01-31",
    });
  });

  it("should return null when startDate is missing", () => {
    const params = {
      endDate: "2024-01-31",
    };
    const result = deserializeDateRange(params);
    expect(result).toBeNull();
  });

  it("should return null when endDate is missing", () => {
    const params = {
      startDate: "2024-01-15",
    };
    const result = deserializeDateRange(params);
    expect(result).toBeNull();
  });

  it("should return null when date format is invalid", () => {
    const params = {
      startDate: "2024/01/15",
      endDate: "2024-01-31",
    };
    const result = deserializeDateRange(params);
    expect(result).toBeNull();
  });

  it("should return null when date is invalid", () => {
    const params = {
      startDate: "2024-13-01", // Invalid month
      endDate: "2024-01-31",
    };
    const result = deserializeDateRange(params);
    expect(result).toBeNull();
  });

  it("should handle same start and end date", () => {
    const params = {
      startDate: "2024-01-15",
      endDate: "2024-01-15",
    };
    const result = deserializeDateRange(params);
    expect(result).toEqual({
      startDate: "2024-01-15",
      endDate: "2024-01-15",
    });
  });
});

describe("getQuickFilterDates", () => {
  // Для тестирования используем фиксированную дату
  // Примечание: эти тесты зависят от текущей даты, поэтому проверяем только формат

  it("should return today's date for 'today' filter", () => {
    const result = getQuickFilterDates("today");
    expect(result.startDate).toBe(result.endDate);
    expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should return yesterday's date for 'yesterday' filter", () => {
    const result = getQuickFilterDates("yesterday");
    expect(result.startDate).toBe(result.endDate);
    expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should return 7-day range for 'last7days' filter", () => {
    const result = getQuickFilterDates("last7days");
    expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Проверяем, что разница составляет 6 дней (включая сегодня = 7 дней)
    // Используем UTC-safe парсинг для избежания проблем с DST
    const [startYear, startMonth, startDay] = result.startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = result.endDate.split("-").map(Number);
    const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(6);
  });

  it("should return 30-day range for 'last30days' filter", () => {
    const result = getQuickFilterDates("last30days");
    expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Проверяем, что разница составляет 29 дней (включая сегодня = 30 дней)
    // Используем UTC-safe парсинг для избежания проблем с DST
    const [startYear, startMonth, startDay] = result.startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = result.endDate.split("-").map(Number);
    const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(29);
  });

  it("should return current month range for 'currentMonth' filter", () => {
    const result = getQuickFilterDates("currentMonth");
    expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Проверяем, что startDate - это первый день месяца
    // Используем UTC-safe парсинг для избежания проблем с DST
    const [startYear, startMonth, startDay] = result.startDate.split("-").map(Number);
    const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    expect(start.getUTCDate()).toBe(1);

    // Проверяем, что endDate - это последний день месяца
    const [endYear, endMonth, endDay] = result.endDate.split("-").map(Number);
    const nextDay = new Date(Date.UTC(endYear, endMonth - 1, endDay + 1));
    expect(nextDay.getUTCDate()).toBe(1); // Следующий день - первое число следующего месяца
  });
});

describe("serializeDateRange and deserializeDateRange round-trip", () => {
  it("should preserve date range through serialization and deserialization", () => {
    const original: DateRange = {
      startDate: "2024-01-15",
      endDate: "2024-01-31",
    };

    const serialized = serializeDateRange(original.startDate, original.endDate);
    const deserialized = deserializeDateRange(serialized);

    expect(deserialized).toEqual(original);
  });

  it("should preserve date range with same start and end", () => {
    const original: DateRange = {
      startDate: "2024-01-15",
      endDate: "2024-01-15",
    };

    const serialized = serializeDateRange(original.startDate, original.endDate);
    const deserialized = deserializeDateRange(serialized);

    expect(deserialized).toEqual(original);
  });

  it("should preserve date range across year boundary", () => {
    const original: DateRange = {
      startDate: "2023-12-15",
      endDate: "2024-01-15",
    };

    const serialized = serializeDateRange(original.startDate, original.endDate);
    const deserialized = deserializeDateRange(serialized);

    expect(deserialized).toEqual(original);
  });
});
