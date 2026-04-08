/**
 * Интеграционный тест для DateRangeFilter
 *
 * Проверяет интеграцию с date-range-utils и корректность валидации
 */

import { describe, expect, it } from "bun:test";
import { getQuickFilterDates, type QuickFilter } from "@/lib/date-range-utils";

describe("DateRangeFilter Integration", () => {
  describe("Quick Filters Integration", () => {
    it("should work with all quick filter types", () => {
      const filters: QuickFilter[] = [
        "today",
        "yesterday",
        "last7days",
        "last30days",
        "currentMonth",
      ];

      filters.forEach((filter) => {
        const result = getQuickFilterDates(filter);

        // Проверяем формат дат
        expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Проверяем, что startDate <= endDate
        expect(new Date(result.startDate).getTime()).toBeLessThanOrEqual(
          new Date(result.endDate).getTime(),
        );
      });
    });

    it("should return valid dates for 'today' filter", () => {
      const result = getQuickFilterDates("today");
      const today = new Date();
      const todayStr = formatDate(today);

      expect(result.startDate).toBe(todayStr);
      expect(result.endDate).toBe(todayStr);
    });

    it("should return 7 days range for 'last7days' filter", () => {
      const result = getQuickFilterDates("last7days");
      const days = calculateDaysBetween(result.startDate, result.endDate);

      expect(days).toBe(7);
    });

    it("should return 30 days range for 'last30days' filter", () => {
      const result = getQuickFilterDates("last30days");
      const days = calculateDaysBetween(result.startDate, result.endDate);

      expect(days).toBe(30);
    });
  });

  describe("Period Validation", () => {
    it("should calculate days correctly", () => {
      expect(calculateDaysBetween("2024-01-01", "2024-01-01")).toBe(1);
      expect(calculateDaysBetween("2024-01-01", "2024-01-02")).toBe(2);
      expect(calculateDaysBetween("2024-01-01", "2024-01-31")).toBe(31);
    });

    it("should detect periods exceeding 90 days", () => {
      const start = "2024-01-01";
      const end = "2024-04-01"; // 91 день
      const days = calculateDaysBetween(start, end);

      expect(days).toBeGreaterThan(90);
    });

    it("should accept periods within 90 days", () => {
      const start = "2024-01-01";
      const end = "2024-03-30"; // 90 дней (31 + 29 + 30)
      const days = calculateDaysBetween(start, end);

      expect(days).toBeLessThanOrEqual(90);
    });
  });

  describe("Date Formatting", () => {
    it("should format dates for display correctly", () => {
      const formatted = formatDateForDisplay("2024-01-15");

      // Проверяем формат DD.MM.YYYY
      expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });

    it("should format dates to ISO correctly", () => {
      const date = new Date(2024, 0, 15); // 15 января 2024
      const iso = formatDateToISO(date);

      expect(iso).toBe("2024-01-15");
    });
  });
});

// Вспомогательные функции (копии из компонента для тестирования)
function calculateDaysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
