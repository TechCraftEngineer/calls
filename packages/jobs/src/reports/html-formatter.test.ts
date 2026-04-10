import { describe, expect, it } from "bun:test";
import { formatTelegramReportHtml } from "./html-formatter";
import type { FormatReportParams } from "./types";

describe("formatTelegramReportHtml", () => {
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

  it("форматирует ежедневный HTML отчет", () => {
    const result = formatTelegramReportHtml(baseParams);

    expect(result).toContain("📊 <b>Звонки за день</b>");
    expect(result).toContain("<b>Период:</b>");
    expect(result).toContain("15.01.2026");
    expect(result).toContain("<b>Компания:</b> Тестовая компания");
    expect(result).toContain("<b>Иван Петров</b>");
    expect(result).toContain("📞 Вх:");
  });

  it("экранирует HTML в названии компании", () => {
    const result = formatTelegramReportHtml({
      ...baseParams,
      workspaceName: "<script>alert('xss')</script>",
    });

    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("показывает сообщение о пустых данных", () => {
    const result = formatTelegramReportHtml({
      ...baseParams,
      stats: {},
    });

    expect(result).toContain("За выбранный период звонков не найдено.");
  });

  it("показывает KPI данные в ежемесячных отчетах", () => {
    const result = formatTelegramReportHtml({
      ...baseParams,
      reportType: "monthly",
      stats: {
        Иван: {
          ...baseStats,
          kpiBaseSalary: 50000,
          kpiCalculatedBonus: 8330,
          kpiTotalSalary: 58330,
        },
      },
    });

    expect(result).toContain("Оклад:");
    expect(result).toContain("Бонус:");
    expect(result).toContain("Итого:");
  });

  it("показывает звонки с низкой оценкой для менеджеров", () => {
    const result = formatTelegramReportHtml({
      ...baseParams,
      isManagerReport: true,
      lowRatedCalls: {
        "Иван Петров": 5,
        "Мария Сидорова": 3,
      },
    });

    expect(result).toContain("Требуют внимания");
    expect(result).toContain("оценка &lt; 3");
  });

  it("показывает итоги по всем сотрудникам", () => {
    const result = formatTelegramReportHtml({
      ...baseParams,
      stats: {
        Иван: baseStats,
        Петр: { ...baseStats, name: "Петр", internalNumber: "102" },
      },
    });

    expect(result).toContain("<b>Итоги по всем сотрудникам:</b>");
    expect(result).toContain("Входящие:");
    expect(result).toContain("Исходящие:");
  });

  it("показывает общий оклад и бонус только в месячных отчетах", () => {
    const monthlyResult = formatTelegramReportHtml({
      ...baseParams,
      reportType: "monthly",
      stats: {
        Иван: { ...baseStats, kpiBaseSalary: 50000, kpiTargetBonus: 10000 },
      },
    });
    const dailyResult = formatTelegramReportHtml({
      ...baseParams,
      reportType: "daily",
      stats: {
        Иван: { ...baseStats, kpiBaseSalary: 50000, kpiTargetBonus: 10000 },
      },
    });

    expect(monthlyResult).toContain("Общий оклад:");
    expect(monthlyResult).toContain("Целевой бонус:");
    expect(dailyResult).not.toContain("Общий оклад:");
  });

  it("показывает итог к выплате для еженедельных и ежемесячных отчетов", () => {
    const weeklyResult = formatTelegramReportHtml({
      ...baseParams,
      reportType: "weekly",
      stats: {
        Иван: { ...baseStats, kpiTotalSalary: 55000 },
      },
    });
    const monthlyResult = formatTelegramReportHtml({
      ...baseParams,
      reportType: "monthly",
      stats: {
        Иван: { ...baseStats, kpiTotalSalary: 55000 },
      },
    });
    const dailyResult = formatTelegramReportHtml({
      ...baseParams,
      reportType: "daily",
      stats: {
        Иван: { ...baseStats, kpiTotalSalary: 55000 },
      },
    });

    expect(weeklyResult).toContain("Итого к выплате:");
    expect(monthlyResult).toContain("Итого к выплате:");
    expect(dailyResult).not.toContain("Итого к выплате:");
  });

  it("обрабатывает валидацию ошибок", () => {
    const result = formatTelegramReportHtml({
      ...baseParams,
      stats: "invalid" as unknown as FormatReportParams["stats"],
    });

    expect(result).toContain("❌ Ошибка");
  });

  it("показывает оценку качества", () => {
    const result = formatTelegramReportHtml({
      ...baseParams,
      isManagerReport: true,
    });

    expect(result).toContain("Ср. оценка качества:");
  });

  it("сортирует звонки с низкой оценкой по количеству", () => {
    const result = formatTelegramReportHtml({
      ...baseParams,
      isManagerReport: true,
      lowRatedCalls: {
        А: 2,
        Б: 10,
        В: 5,
      },
    });

    // Проверяем что идут в порядке убывания
    const aIndex = result.indexOf("<b>Б</b>");
    const bIndex = result.indexOf("<b>В</b>");
    const cIndex = result.indexOf("<b>А</b>");

    expect(aIndex).toBeLessThan(bIndex);
    expect(bIndex).toBeLessThan(cIndex);
  });
});
