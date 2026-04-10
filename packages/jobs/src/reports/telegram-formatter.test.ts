import { describe, expect, it } from "bun:test";
import { formatTelegramReport } from "./telegram-formatter";
import type { FormatReportParams } from "./types";

describe("formatTelegramReport", () => {
  const baseStats = {
    name: "Иван",
    internalNumber: "101",
    incoming: { count: 10, duration: 600 },
    outgoing: { count: 5, duration: 300 },
    avgManagerScore: 4.5,
    evaluatedCount: 15,
  };

  const baseParams: FormatReportParams = {
    stats: {
      "Иван Петров": baseStats,
    },
    dateFrom: new Date("2026-01-15"),
    dateTo: new Date("2026-01-15"),
    reportType: "daily",
    isManagerReport: false,
    workspaceName: "Тестовая компания",
  };

  it("форматирует ежедневный отчет", () => {
    const result = formatTelegramReport(baseParams);

    expect(result).toContain("📊 Звонки за день");
    expect(result).toContain("15.01.2026");
    expect(result).toContain("🏢 Тестовая компания");
    expect(result).toContain("👤 Иван Петров");
    expect(result).toContain("📞 Вх: 10");
    expect(result).toContain("Исх: 5");
  });

  it("форматирует еженедельный отчет", () => {
    const result = formatTelegramReport({
      ...baseParams,
      reportType: "weekly",
      dateFrom: new Date("2026-01-08"),
      dateTo: new Date("2026-01-15"),
    });

    expect(result).toContain("📊 Звонки за неделю");
    expect(result).toContain("08.01.2026");
    expect(result).toContain("15.01.2026");
  });

  it("форматирует ежемесячный отчет", () => {
    const result = formatTelegramReport({
      ...baseParams,
      reportType: "monthly",
      dateFrom: new Date("2025-12-01"),
      dateTo: new Date("2026-01-01"),
    });

    expect(result).toContain("📊 Звонки за месяц");
    expect(result).toContain("01.12.2025");
    expect(result).toContain("01.01.2026");
  });

  it("добавляет метку для менеджерского отчета", () => {
    const result = formatTelegramReport({
      ...baseParams,
      isManagerReport: true,
    });

    expect(result).toContain("(сводка по менеджерам)");
  });

  it("показывает информацию об оценках для менеджерских отчетов", () => {
    const result = formatTelegramReport({
      ...baseParams,
      isManagerReport: true,
    });

    expect(result).toContain("Оценено:");
  });

  it("показывает звонки с низкой оценкой", () => {
    const result = formatTelegramReport({
      ...baseParams,
      isManagerReport: true,
      lowRatedCalls: {
        "Иван Петров": 3,
      },
    });

    expect(result).toContain("Требуют внимания");
    expect(result).toContain("оценка < 3");
    expect(result).toContain("3 звонка");
  });

  it("не показывает звонки с низкой оценкой для обычных отчетов", () => {
    const result = formatTelegramReport({
      ...baseParams,
      isManagerReport: false,
      lowRatedCalls: {
        "Иван Петров": 3,
      },
    });

    expect(result).not.toContain("Требуют внимания");
  });

  it("показывает KPI данные", () => {
    const result = formatTelegramReport({
      ...baseParams,
      reportType: "monthly",
      stats: {
        "Иван Петров": {
          ...baseStats,
          kpiBaseSalary: 50000,
          kpiTargetBonus: 10000,
          kpiTargetTalkTimeMinutes: 120,
          kpiActualTalkTimeMinutes: 100,
          kpiCompletionPercentage: 83.3,
          kpiCalculatedBonus: 8330,
          kpiTotalSalary: 58330,
        },
      },
    });

    expect(result).toContain("📈 KPI сотрудников:");
    expect(result).toContain("Оклад:");
    expect(result).toContain("План минут:");
    expect(result).toContain("% выполнения:");
  });

  it("показывает оклад только в ежемесячных отчетах", () => {
    const monthlyResult = formatTelegramReport({
      ...baseParams,
      reportType: "monthly",
      stats: {
        Иван: {
          ...baseStats,
          kpiBaseSalary: 50000,
          kpiCalculatedBonus: 5000,
          kpiTotalSalary: 55000,
        },
      },
    });
    const weeklyResult = formatTelegramReport({
      ...baseParams,
      reportType: "weekly",
      stats: {
        Иван: {
          ...baseStats,
          kpiBaseSalary: 50000,
          kpiCalculatedBonus: 5000,
          kpiTotalSalary: 55000,
        },
      },
    });
    const dailyResult = formatTelegramReport({
      ...baseParams,
      reportType: "daily",
      stats: {
        Иван: {
          ...baseStats,
          kpiBaseSalary: 50000,
          kpiCalculatedBonus: 5000,
          kpiTotalSalary: 55000,
        },
      },
    });

    expect(monthlyResult).toContain("Общий оклад:");
    expect(weeklyResult).not.toContain("Общий оклад:");
    expect(dailyResult).not.toContain("Общий оклад:");
  });

  it("показывает итоговую сумму для еженедельных и ежемесячных отчетов", () => {
    const monthlyResult = formatTelegramReport({
      ...baseParams,
      reportType: "monthly",
      stats: {
        Иван: { ...baseStats, kpiTotalSalary: 55000 },
      },
    });
    const weeklyResult = formatTelegramReport({
      ...baseParams,
      reportType: "weekly",
      stats: {
        Иван: { ...baseStats, kpiTotalSalary: 55000 },
      },
    });
    const dailyResult = formatTelegramReport({
      ...baseParams,
      reportType: "daily",
      stats: {
        Иван: { ...baseStats, kpiTotalSalary: 55000 },
      },
    });

    expect(monthlyResult).toContain("Итого к выплате:");
    expect(weeklyResult).toContain("Итого к выплате:");
    expect(dailyResult).not.toContain("Итого к выплате:");
  });

  it("обрабатывает пустые данные", () => {
    const result = formatTelegramReport({
      ...baseParams,
      stats: {},
    });

    expect(result).toContain("Нет данных за период.");
  });

  it("обрабатывает валидацию ошибок", () => {
    const result = formatTelegramReport({
      ...baseParams,
      stats: "invalid" as unknown as FormatReportParams["stats"],
    });

    expect(result).toContain("❌ Ошибка");
  });

  it("показывает среднюю оценку качества", () => {
    const result = formatTelegramReport(baseParams);

    expect(result).toContain("Средняя оценка качества:");
    expect(result).toContain("4.5");
  });

  it("сортирует менеджеров по количеству звонков", () => {
    const result = formatTelegramReport({
      ...baseParams,
      stats: {
        "А (5 звонков)": {
          ...baseStats,
          incoming: { count: 5, duration: 300 },
          outgoing: { count: 0, duration: 0 },
        },
        "Б (15 звонков)": {
          ...baseStats,
          incoming: { count: 15, duration: 900 },
          outgoing: { count: 0, duration: 0 },
        },
        "В (10 звонков)": {
          ...baseStats,
          incoming: { count: 10, duration: 600 },
          outgoing: { count: 0, duration: 0 },
        },
      },
    });

    const lines = result.split("\n");
    const managerLines = lines.filter((line) => line.startsWith("👤"));

    expect(managerLines[0]).toContain("Б (15 звонков)");
    expect(managerLines[1]).toContain("В (10 звонков)");
    expect(managerLines[2]).toContain("А (5 звонков)");
  });
});
