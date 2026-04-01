/**
 * Форматирование отчетов для Telegram
 */

import type { FormatReportParams, PreparedStats, StatsTotals } from "./types";
import { formatValue, formatScore, pluralizeCalls, getReportTypeLabel, validateReportParams } from "./utils";
import { prepareStats, computeOverallAverages } from "./stats-processor";

export function formatTelegramReport(params: FormatReportParams): string {
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

  // Валидация входных параметров
  const validationError = validateReportParams({ stats, dateFrom, dateTo, reportType });
  if (validationError) {
    return validationError;
  }

  const typeLabel = getReportTypeLabel(reportType);
  const scopeLabel = isManagerReport ? " (сводка по менеджерам)" : "";

  const lines: string[] = [];
  lines.push(`📊 ${typeLabel} отчёт по звонкам${scopeLabel}`);
  lines.push(
    `📅 ${dateFrom.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })} — ${dateTo.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}`,
  );
  if (workspaceName) {
    lines.push(`🏢 ${workspaceName}`);
  }
  lines.push("");

  const entries = Object.entries(stats);
  if (entries.length === 0) {
    lines.push("Нет данных за период.");
    return lines.join("\n");
  }

  const { managers, totals } = prepareStats(entries);
  const overall = computeOverallAverages(managers);

  // Таблица KPI сотрудников
  lines.push("📈 KPI сотрудников:");
  lines.push("");

  if (includeKpi) {
    // Формат списка вместо таблицы для лучшей читаемости в Telegram
    for (const s of managers) {
      const totalMinutes = s.kpiActualTalkTimeMinutes ?? 0;
      const targetPlan = s.kpiTargetTalkTimeMinutes ?? 0;
      const completionPercentage = s.kpiCompletionPercentage ?? 0;
      
      // Вычисляем минуты для входящих и исходящих
      const incomingMinutes = Math.round(s.incomingTotalDurationSec / 60);
      const outgoingMinutes = Math.round(s.outgoingTotalDurationSec / 60);

      lines.push(`👤 ${s.name}`);
      lines.push(`   📞 Вх: ${s.incomingCount} (${incomingMinutes}мин) | Исх: ${s.outgoingCount} (${outgoingMinutes}мин) | Всего: ${s.totalCount} (${totalMinutes}мин)`);
      
      // Показываем оклад только в ежемесячных отчетах
      if (reportType === "monthly") {
        lines.push(
          `   💰 Оклад: ${s.kpiBaseSalary !== null && s.kpiBaseSalary !== undefined ? formatValue(s.kpiBaseSalary) : "—"} ₽ | 🎁 Бонус: ${s.kpiCalculatedBonus !== null && s.kpiCalculatedBonus !== undefined ? formatValue(s.kpiCalculatedBonus) : "—"} ₽`,
        );
        lines.push(
          `   💵 Итого: ${s.kpiTotalSalary !== null && s.kpiTotalSalary !== undefined ? formatValue(s.kpiTotalSalary) : "—"} ₽`,
        );
      } else if (reportType === "weekly") {
        lines.push(
          `   🎁 Бонус: ${s.kpiCalculatedBonus !== null && s.kpiCalculatedBonus !== undefined ? formatValue(s.kpiCalculatedBonus) : "—"} ₽`,
        );
        lines.push(
          `   💵 Итого: ${s.kpiTotalSalary !== null && s.kpiTotalSalary !== undefined ? formatValue(s.kpiTotalSalary) : "—"} ₽`,
        );
      } else {
        // Ежедневный отчет - только бонус
        lines.push(
          `   🎁 Бонус: ${s.kpiCalculatedBonus !== null && s.kpiCalculatedBonus !== undefined ? formatValue(s.kpiCalculatedBonus) : "—"} ₽`,
        );
      }
      
      lines.push(
        `   📊 План минут: ${formatValue(targetPlan)} | 📈 Факт: ${totalMinutes}`,
      );
      lines.push(
        `   📊 % выполнения: ${completionPercentage}%`,
      );
      lines.push("");
    }
  } else {
    // Формат списка без KPI
    for (const s of managers) {
      const totalMinutes = s.kpiActualTalkTimeMinutes ?? 0;
      
      // Вычисляем минуты для входящих и исходящих
      const incomingMinutes = Math.round(s.incomingTotalDurationSec / 60);
      const outgoingMinutes = Math.round(s.outgoingTotalDurationSec / 60);

      lines.push(`👤 ${s.name}`);
      lines.push(`   📞 Вх: ${s.incomingCount} (${incomingMinutes}мин) | Исх: ${s.outgoingCount} (${outgoingMinutes}мин) | Всего: ${s.totalCount} (${totalMinutes}мин)`);
      lines.push("");
    }
  }
  lines.push("");

  // Итоги по всем
  const totalMinutes = totals.totalKpiActualTalkTimeMinutes ?? 0;
  const totalIncomingMinutes = Math.round(totals.incomingTotalDurationSec / 60);
  const totalOutgoingMinutes = Math.round(totals.outgoingTotalDurationSec / 60);
  
  lines.push(`📊 **Итоги по всем сотрудникам:**`);
  lines.push(`• Входящие: ${totals.incomingCount} (${totalIncomingMinutes}мин)`);
  lines.push(`• Исходящие: ${totals.outgoingCount} (${totalOutgoingMinutes}мин)`);
  lines.push(`• Всего: ${totals.totalCount} (${totalMinutes}мин)`);

  if (isManagerReport && totals.totalCount > 0) {
    lines.push(`• Оценено: ${totals.evaluatedCount} из ${totals.totalCount} звонков`);
  }
  if (overall.avgManagerScore != null) {
    lines.push(`• Средняя оценка качества: ${formatScore(overall.avgManagerScore)} ⭐`);
  }

  // KPI итоги
  if (includeKpi) {
    // Используем уже вычисленный план из totals
    const totalTargetPlan = totals.totalKpiTargetTalkTimeMinutes ?? 0;
    
    // Показываем общий оклад и целевой бонус только в ежемесячных отчетах
    if (reportType === "monthly") {
      lines.push(`• Общий оклад: ${formatValue(totals.totalBaseSalary)} ₽`);
      lines.push(`• Целевой бонус: ${formatValue(totals.totalTargetBonus)} ₽`);
    }
    lines.push(`• Начисленный бонус: ${formatValue(totals.totalCalculatedBonus)} ₽`);
    lines.push(`• План минут: ${formatValue(totalTargetPlan)}`);
    lines.push(`• Факт минут: ${formatValue(totals.totalKpiActualTalkTimeMinutes)}`);
    lines.push(`• Факт выполнения: ${formatValue(totals.totalActualPerformanceRubles)} ₽`);
    
    // Показываем итоговую сумму только для еженедельных и ежемесячных отчетов
    if (reportType !== "daily") {
      lines.push(`• Итого к выплате: ${formatValue(totals.totalSalary)} ₽`);
    }
  }

  // Требуют внимания
  const lowRatedEntries = Object.entries(lowRatedCalls).filter(([, n]) => n > 0);
  if (isManagerReport && lowRatedEntries.length > 0) {
    lines.push("");
    lines.push("⚠️ **Требуют внимания (оценка < 3):**");
    for (const [manager, count] of lowRatedEntries) {
      lines.push(`• ${manager}: ${count} ${pluralizeCalls(count)}`);
    }
  }

  return lines.join("\n");
}
