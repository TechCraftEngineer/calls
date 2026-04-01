/**
 * Форматирование HTML отчетов для Telegram
 */

import type { FormatReportParams } from "./types";
import { formatValue, formatScore, pluralizeCalls, getReportTypeLabel, validateReportParams, escapeHtml } from "./utils";
import { prepareStats, computeOverallAverages, calculateMinutesFromSeconds } from "./stats-processor";

export function formatTelegramReportHtml(params: FormatReportParams): string {
  const {
    stats,
    dateFrom,
    dateTo,
    reportType,
    isManagerReport,
    workspaceName,
    lowRatedCalls = {},
    includeKpi = false,
  } = params;

  const validationError = validateReportParams({ stats, dateFrom, dateTo, reportType });
  if (validationError) {
    return validationError;
  }

  const typeLabel = getReportTypeLabel(reportType);
  const entries = Object.entries(stats);
  const { managers, totals } = prepareStats(entries);
  const overall = computeOverallAverages(managers);

  if (managers.length === 0) {
    return [
      `📊 <b>${typeLabel} отчёт по звонкам</b>`,
      `📅 <b>Период:</b> ${escapeHtml(dateFrom.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }))} — ${escapeHtml(dateTo.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }))}`,
      workspaceName ? `🏢 <b>Компания:</b> ${escapeHtml(workspaceName)}` : "",
      "",
      "За выбранный период звонков не найдено.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const lowRatedEntries = Object.entries(lowRatedCalls)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  const lines: string[] = [];
  lines.push(`📊 <b>${typeLabel} отчёт по звонкам</b>`);
  lines.push(
    `📅 <b>Период:</b> ${escapeHtml(dateFrom.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }))} — ${escapeHtml(dateTo.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }))}`,
  );
  if (workspaceName) {
    lines.push(`🏢 <b>Компания:</b> ${escapeHtml(workspaceName)}`);
  }
  lines.push("");

  // Таблица KPI сотрудников
  lines.push("📈 <b>KPI сотрудников:</b>");
  lines.push("");

  if (includeKpi) {
    for (const s of managers) {
      const totalMinutes = s.kpiActualTalkTimeMinutes ?? 0;
      const targetPlan = s.kpiTargetTalkTimeMinutes ?? 0;
      const completionPercentage = s.kpiCompletionPercentage ?? 0;
      
      // Используем precomputed минуты для согласованности
      const incomingMinutes = s.incomingMinutes;
      const outgoingMinutes = s.outgoingMinutes;

      lines.push(`👤 <b>${escapeHtml(s.name)}</b>`);
      lines.push(`   📞 Вх: <b>${s.incomingCount}</b> (${incomingMinutes}мин) | Исх: <b>${s.outgoingCount}</b> (${outgoingMinutes}мин) | Всего: <b>${s.totalCount}</b> (${totalMinutes}мин)`);
      
      // Показываем оклад только в ежемесячных отчетах
      if (reportType === "monthly") {
        lines.push(
          `   💰 Оклад: <b>${s.kpiBaseSalary !== null && s.kpiBaseSalary !== undefined ? formatValue(s.kpiBaseSalary) : "—"} ₽</b> | 🎁 Бонус: <b>${s.kpiCalculatedBonus !== null && s.kpiCalculatedBonus !== undefined ? formatValue(s.kpiCalculatedBonus) : "—"} ₽</b>`,
        );
        lines.push(
          `   💵 Итого: <b>${s.kpiTotalSalary !== null && s.kpiTotalSalary !== undefined ? formatValue(s.kpiTotalSalary) : "—"} ₽</b>`,
        );
      } else if (reportType === "weekly") {
        lines.push(
          `   🎁 Бонус: <b>${s.kpiCalculatedBonus !== null && s.kpiCalculatedBonus !== undefined ? formatValue(s.kpiCalculatedBonus) : "—"} ₽</b>`,
        );
        lines.push(
          `   💵 Итого: <b>${s.kpiTotalSalary !== null && s.kpiTotalSalary !== undefined ? formatValue(s.kpiTotalSalary) : "—"} ₽</b>`,
        );
      } else {
        // Звонки - только бонус
        lines.push(
          `   🎁 Бонус: <b>${s.kpiCalculatedBonus !== null && s.kpiCalculatedBonus !== undefined ? formatValue(s.kpiCalculatedBonus) : "—"} ₽</b>`,
        );
      }
      
      lines.push(
        `   📊 План минут: <b>${formatValue(targetPlan)}</b> | 📈 Факт: <b>${totalMinutes}</b>`,
      );
      lines.push(
        `   📊 % выполнения: <b>${completionPercentage}</b>%`,
      );
      lines.push("");
    }
  } else {
    for (const s of managers) {
      const totalMinutes = s.kpiActualTalkTimeMinutes ?? 0;
      
      // Используем precomputed минуты для согласованности
      const incomingMinutes = s.incomingMinutes;
      const outgoingMinutes = s.outgoingMinutes;

      lines.push(`👤 <b>${escapeHtml(s.name)}</b>`);
      lines.push(`   📞 Вх: <b>${s.incomingCount}</b> (${incomingMinutes}мин) | Исх: <b>${s.outgoingCount}</b> (${outgoingMinutes}мин) | Всего: <b>${s.totalCount}</b> (${totalMinutes}мин)`);
      lines.push("");
    }
  }

  lines.push("");

  // Итоги по всем
  const totalMinutes = totals.totalKpiActualTalkTimeMinutes;
  const totalIncomingMinutes = calculateMinutesFromSeconds(totals.incomingTotalDurationSec);
  const totalOutgoingMinutes = calculateMinutesFromSeconds(totals.outgoingTotalDurationSec);
  
  lines.push("📊 <b>Итоги по всем сотрудникам:</b>");
  lines.push(`• Входящие: <b>${totals.incomingCount}</b> (${totalIncomingMinutes}мин)`);
  lines.push(`• Исходящие: <b>${totals.outgoingCount}</b> (${totalOutgoingMinutes}мин)`);
  lines.push(`• Всего: <b>${totals.totalCount}</b> (${totalMinutes}мин)`);

  if (isManagerReport && totals.totalCount > 0) {
    lines.push(`• Оценено: <b>${totals.evaluatedCount}/${totals.totalCount}</b>`);
  }
  if (overall.avgManagerScore != null) {
    lines.push(`• Ср. оценка качества: <b>${formatScore(overall.avgManagerScore)}</b> ⭐`);
  }

  // KPI итоги
  if (includeKpi) {
    // Используем уже вычисленный план из totals
    const totalTargetPlan = totals.totalKpiTargetTalkTimeMinutes ?? 0;
    
    // Показываем общий оклад и целевой бонус только в ежемесячных отчетах
    if (reportType === "monthly") {
      lines.push(`• Общий оклад: <b>${totals.totalBaseSalary > 0 ? formatValue(totals.totalBaseSalary) : "—"} ₽</b>`);
      lines.push(`• Целевой бонус: <b>${totals.totalTargetBonus > 0 ? formatValue(totals.totalTargetBonus) : "—"} ₽</b>`);
    }
    lines.push(`• Начисленный бонус: <b>${totals.totalCalculatedBonus > 0 ? formatValue(totals.totalCalculatedBonus) : "—"} ₽</b>`);
    lines.push(`• План минут: <b>${totalTargetPlan > 0 ? formatValue(totalTargetPlan) : "—"}</b>`);
    lines.push(`• Факт минут: <b>${totals.totalKpiActualTalkTimeMinutes > 0 ? formatValue(totals.totalKpiActualTalkTimeMinutes) : "—"}</b>`);
    lines.push(`• Факт выполнения: <b>${totals.totalActualPerformanceRubles > 0 ? formatValue(totals.totalActualPerformanceRubles) : "—"} ₽</b>`);
    
    // Показываем итоговую сумму только для еженедельных и ежемесячных отчетов
    if (reportType !== "daily") {
      lines.push(`• Итого к выплате: <b>${totals.totalSalary > 0 ? formatValue(totals.totalSalary) : "—"} ₽</b>`);
    }
  }

  if (isManagerReport && lowRatedEntries.length > 0) {
    lines.push("");
    lines.push("⚠️ <b>Требуют внимания (оценка &lt; 3)</b>");
    for (const [manager, count] of lowRatedEntries.slice(0, 10)) {
      lines.push(`• <b>${escapeHtml(manager)}</b>: ${count} ${pluralizeCalls(count)}`);
    }
  }

  return lines.join("\n");
}
