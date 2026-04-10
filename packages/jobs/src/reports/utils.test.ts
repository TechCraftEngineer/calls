import { describe, expect, it } from "bun:test";
import {
  escapeHtml,
  formatScore,
  formatValue,
  getReportTypeLabel,
  pluralizeCalls,
  validateReportParams,
} from "./utils";

describe("formatValue", () => {
  it("форматирует целые числа", () => {
    const result = formatValue(1000);
    expect(result).toMatch(/1.*000/);
    expect(result).toContain("1");
    expect(result).toContain("000");
    expect(formatValue(500)).toBe("500");
  });

  it("округляет дробные числа", () => {
    const r1 = formatValue(1000.4);
    const r2 = formatValue(1000.6);
    expect(r1).toContain("1");
    expect(r1).toContain("000");
    expect(r2).toContain("1");
    expect(r2).toContain("001");
  });

  it("возвращает тире для нечисловых значений", () => {
    expect(formatValue(NaN)).toBe("—");
    expect(formatValue(Infinity)).toBe("—");
    expect(formatValue(-Infinity)).toBe("—");
  });

  it("форматирует отрицательные числа", () => {
    const result = formatValue(-1000);
    expect(result).toContain("-1");
    expect(result).toContain("000");
  });
});

describe("formatScore", () => {
  it("форматирует оценку с одним десятичным знаком", () => {
    expect(formatScore(4.567)).toBe("4.6");
    expect(formatScore(3.0)).toBe("3.0");
  });

  it("возвращает тире для нечисловых значений", () => {
    expect(formatScore(null)).toBe("—");
    expect(formatScore(undefined)).toBe("—");
    expect(formatScore(NaN)).toBe("—");
  });
});

describe("escapeHtml", () => {
  it("экранирует специальные символы HTML", () => {
    expect(escapeHtml("<div>test</div>")).toBe("&lt;div&gt;test&lt;/div&gt;");
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("не меняет обычный текст", () => {
    expect(escapeHtml("просто текст")).toBe("просто текст");
    expect(escapeHtml("123")).toBe("123");
  });
});

describe("pluralizeCalls", () => {
  it("возвращает правильное склонение для 1", () => {
    expect(pluralizeCalls(1)).toBe("звонок");
    expect(pluralizeCalls(21)).toBe("звонок");
    expect(pluralizeCalls(101)).toBe("звонок");
  });

  it("возвращает правильное склонение для 2-4", () => {
    expect(pluralizeCalls(2)).toBe("звонка");
    expect(pluralizeCalls(3)).toBe("звонка");
    expect(pluralizeCalls(4)).toBe("звонка");
    expect(pluralizeCalls(22)).toBe("звонка");
  });

  it("возвращает правильное склонение для 5-20", () => {
    expect(pluralizeCalls(5)).toBe("звонков");
    expect(pluralizeCalls(10)).toBe("звонков");
    expect(pluralizeCalls(11)).toBe("звонков");
    expect(pluralizeCalls(15)).toBe("звонков");
    expect(pluralizeCalls(20)).toBe("звонков");
  });

  it("обрабатывает исключения 11-19", () => {
    expect(pluralizeCalls(11)).toBe("звонков");
    expect(pluralizeCalls(12)).toBe("звонков");
    expect(pluralizeCalls(111)).toBe("звонков");
    expect(pluralizeCalls(114)).toBe("звонков");
  });
});

describe("getReportTypeLabel", () => {
  it("возвращает правильные метки", () => {
    expect(getReportTypeLabel("daily")).toBe("Звонки за день");
    expect(getReportTypeLabel("weekly")).toBe("Звонки за неделю");
    expect(getReportTypeLabel("monthly")).toBe("Звонки за месяц");
  });

  it("возвращает значение по умолчанию", () => {
    expect(getReportTypeLabel("unknown" as "daily")).toBe("Звонки");
  });
});

describe("validateReportParams", () => {
  it("возвращает null для валидных параметров", () => {
    const validParams = {
      stats: {
        Иван: {
          name: "Иван",
          internalNumber: "101",
          incoming: { count: 5, duration: 300 },
          outgoing: { count: 3, duration: 200 },
        },
      },
      dateFrom: new Date("2026-01-01"),
      dateTo: new Date("2026-01-31"),
      reportType: "daily" as const,
    };
    expect(validateReportParams(validParams)).toBeNull();
  });

  it("возвращает ошибку для невалидной даты", () => {
    const invalidParams = {
      stats: {},
      dateFrom: "not-a-date",
      dateTo: new Date(),
      reportType: "daily",
    };
    const result = validateReportParams(invalidParams);
    expect(result).toContain("❌ Ошибка");
    expect(result).toContain("dateFrom");
    expect(result).toContain("date");
  });

  it("возвращает ошибку для невалидного типа отчета", () => {
    const invalidParams = {
      stats: {},
      dateFrom: new Date(),
      dateTo: new Date(),
      reportType: "yearly",
    };
    const result = validateReportParams(invalidParams);
    expect(result).toContain("❌ Ошибка");
    expect(result).toContain("reportType");
    expect(result).toContain("daily");
    expect(result).toContain("weekly");
    expect(result).toContain("monthly");
  });

  it("возвращает ошибку для невалидных stats", () => {
    const invalidParams = {
      stats: "not-an-object",
      dateFrom: new Date(),
      dateTo: new Date(),
      reportType: "daily",
    };
    const result = validateReportParams(invalidParams);
    expect(result).toContain("❌ Ошибка");
  });
});
