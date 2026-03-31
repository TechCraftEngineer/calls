/**
 * Форматирование текста отчёта по звонкам для Telegram
 */

import type { EnrichedManagerStats } from "../../../db/src/repositories/calls/enrich-stats";

export interface ManagerStats {
  name: string;
  internalNumber: string | null;
  incoming: { count: number; duration: number; totalDuration?: number };
  outgoing: { count: number; duration: number; totalDuration?: number };
  avgManagerScore?: number | null;
  evaluatedCount?: number;
  // KPI данные
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
  kpiActualTalkTimeMinutes?: number;
  kpiCompletionPercentage?: number;
  kpiCalculatedBonus?: number;
  kpiTotalSalary?: number;
}

export interface PreparedStats {
  name: string;
  incomingCount: number;
  outgoingCount: number;
  totalCount: number;
  incomingAvgDurationSec: number;
  outgoingAvgDurationSec: number;
  avgManagerScore?: number | null;
  evaluatedCount: number;
  // KPI данные
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
  kpiActualTalkTimeMinutes?: number;
  kpiCompletionPercentage?: number;
  kpiCalculatedBonus?: number;
  kpiTotalSalary?: number;
}

export interface FormatReportParams {
  stats: Record<string, ManagerStats | EnrichedManagerStats>;
  dateFrom: Date;
  dateTo: Date;
  reportType: "daily" | "weekly" | "monthly";
  isManagerReport: boolean;
  workspaceName?: string;
  detailed?: boolean;
  includeAvgRating?: boolean;
  includeAvgValue?: boolean;
  /** Звонки с низкой оценкой по менеджерам (managerScore < 3) */
  lowRatedCalls?: Record<string, number>;
  /** Включать KPI данные в отчет */
  includeKpi?: boolean;
  /** Включать саммари звонков (внутреннее поле) */
  _includeCallSummaries?: boolean;
  /** Саммари по менеджерам (внутреннее поле) */
  _callSummariesByManager?: Record<string, string[]>;
}

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

function formatScore(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Русская склонение: 1 звонок, 2 звонка, 5 звонков */
function pluralizeCalls(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return "звонков";
  if (mod10 === 1) return "звонок";
  if (mod10 >= 2 && mod10 <= 4) return "звонка";
  return "звонков";
}

function prepareStats(entries: [string, ManagerStats][]): {
  managers: PreparedStats[];
  totals: {
    incomingCount: number;
    outgoingCount: number;
    totalCount: number;
    incomingTotalDurationSec: number;
    outgoingTotalDurationSec: number;
    evaluatedCount: number;
    // KPI итоги
    totalBaseSalary: number;
    totalTargetBonus: number;
    totalCalculatedBonus: number;
    totalSalary: number;
  };
} {
  const managers: PreparedStats[] = [];
  let incomingCount = 0;
  let outgoingCount = 0;
  let incomingTotalDurationSec = 0;
  let outgoingTotalDurationSec = 0;
  let evaluatedCount = 0;
  // KPI итоги
  let totalBaseSalary = 0;
  let totalTargetBonus = 0;
  let totalCalculatedBonus = 0;
  let totalSalary = 0;

  for (const [name, raw] of entries) {
    if (!raw || typeof raw !== "object") continue;
    const inCount = raw.incoming?.count ?? 0;
    const outCount = raw.outgoing?.count ?? 0;
    const inTotalSec =
      raw.incoming?.totalDuration ?? (raw.incoming?.duration ?? 0) * inCount;
    const outTotalSec =
      raw.outgoing?.totalDuration ?? (raw.outgoing?.duration ?? 0) * outCount;
    const inAvgSec = inCount > 0 ? inTotalSec / inCount : 0;
    const outAvgSec = outCount > 0 ? outTotalSec / outCount : 0;
    const total = inCount + outCount;
    const evalCount = raw.evaluatedCount ?? 0;

    incomingCount += inCount;
    outgoingCount += outCount;
    incomingTotalDurationSec += inTotalSec;
    outgoingTotalDurationSec += outTotalSec;
    evaluatedCount += evalCount;

    // KPI итоги
    totalBaseSalary += raw.kpiBaseSalary ?? 0;
    totalTargetBonus += raw.kpiTargetBonus ?? 0;
    totalCalculatedBonus += raw.kpiCalculatedBonus ?? 0;
    totalSalary += raw.kpiTotalSalary ?? 0;

    managers.push({
      name,
      incomingCount: inCount,
      outgoingCount: outCount,
      totalCount: total,
      incomingAvgDurationSec: inAvgSec,
      outgoingAvgDurationSec: outAvgSec,
      avgManagerScore: raw.avgManagerScore,
      evaluatedCount: evalCount,
      // KPI данные
      kpiBaseSalary: raw.kpiBaseSalary,
      kpiTargetBonus: raw.kpiTargetBonus,
      kpiTargetTalkTimeMinutes: raw.kpiTargetTalkTimeMinutes,
      kpiActualTalkTimeMinutes: raw.kpiActualTalkTimeMinutes,
      kpiCompletionPercentage: raw.kpiCompletionPercentage,
      kpiCalculatedBonus: raw.kpiCalculatedBonus,
      kpiTotalSalary: raw.kpiTotalSalary,
    });
  }

  managers.sort(
    (a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name),
  );

  return {
    managers,
    totals: {
      incomingCount,
      outgoingCount,
      totalCount: incomingCount + outgoingCount,
      incomingTotalDurationSec,
      outgoingTotalDurationSec,
      evaluatedCount,
      // KPI итоги
      totalBaseSalary,
      totalTargetBonus,
      totalCalculatedBonus,
      totalSalary,
    },
  };
}

function computeOverallAverages(managers: PreparedStats[]): {
  avgManagerScore: number | null;
} {
  let scoreWeightedSum = 0;
  let scoreWeight = 0;

  for (const item of managers) {
    const weight = item.evaluatedCount ?? 0;
    if (weight <= 0) continue;
    if (typeof item.avgManagerScore === "number") {
      scoreWeightedSum += item.avgManagerScore * weight;
      scoreWeight += weight;
    }
  }

  return {
    avgManagerScore: scoreWeight > 0 ? scoreWeightedSum / scoreWeight : null,
  };
}

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
  if (!stats || typeof stats !== "object") {
    return "❌ Ошибка: отсутствуют данные статистики";
  }

  if (!dateFrom || !dateTo) {
    return "❌ Ошибка: отсутствуют даты периода";
  }

  if (!reportType || !["daily", "weekly", "monthly"].includes(reportType)) {
    return "❌ Ошибка: неверный тип отчёта";
  }

  const typeLabel =
    reportType === "daily"
      ? "Ежедневный"
      : reportType === "weekly"
        ? "Еженедельный"
        : "Ежемесячный";
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
      const totalMinutes = Math.round(
        (s.incomingAvgDurationSec * s.incomingCount +
          s.outgoingAvgDurationSec * s.outgoingCount) /
          60,
      );

      lines.push(`👤 ${s.name}`);
      lines.push(`   📞 Звонков: ${s.totalCount} | ⏱️ Минут: ${totalMinutes}`);
      lines.push(`   💰 Оклад: ${s.kpiBaseSalary !== null && s.kpiBaseSalary !== undefined ? formatValue(s.kpiBaseSalary) : '—'} ₽ | 🎁 Бонус: ${s.kpiCalculatedBonus !== null && s.kpiCalculatedBonus !== undefined ? formatValue(s.kpiCalculatedBonus) : '—'} ₽`);
      lines.push(`   💵 Итого: ${s.kpiTotalSalary !== null && s.kpiTotalSalary !== undefined ? formatValue(s.kpiTotalSalary) : '—'} ₽`);
      lines.push("");
    }
  } else {
    // Формат списка без KPI
    for (const s of managers) {
      const totalMinutes = Math.round(
        (s.incomingAvgDurationSec * s.incomingCount +
          s.outgoingAvgDurationSec * s.outgoingCount) /
          60,
      );

      lines.push(`👤 ${s.name}`);
      lines.push(`   📞 Звонков: ${s.totalCount} | ⏱️ Минут: ${totalMinutes}`);
      lines.push("");
    }
  }
  lines.push("");

  // Итоги по всем
  const totalMinutes = Math.round(
    (totals.incomingTotalDurationSec + totals.outgoingTotalDurationSec) / 60,
  );
  lines.push(`📊 **Итоги по всем сотрудникам:**`);
  lines.push(`• Всего звонков: ${totals.totalCount}`);
  lines.push(`• Всего минут: ${totalMinutes}`);

  if (isManagerReport && totals.totalCount > 0) {
    lines.push(
      `• Оценено: ${totals.evaluatedCount} из ${totals.totalCount} звонков`,
    );
  }
  if (overall.avgManagerScore != null) {
    lines.push(
      `• Средняя оценка качества: ${formatScore(overall.avgManagerScore)} ⭐`,
    );
  }

  // KPI итоги
  if (includeKpi) {
    lines.push(`• Общий оклад: ${formatValue(totals.totalBaseSalary)} ₽`);
    lines.push(`• Целевой бонус: ${formatValue(totals.totalTargetBonus)} ₽`);
    lines.push(
      `• Начисленный бонус: ${formatValue(totals.totalCalculatedBonus)} ₽`,
    );
    lines.push(`• Итого к выплате: ${formatValue(totals.totalSalary)} ₽`);
  }

  // Требуют внимания
  const lowRatedEntries = Object.entries(lowRatedCalls).filter(
    ([, n]) => n > 0,
  );
  if (isManagerReport && lowRatedEntries.length > 0) {
    lines.push("");
    lines.push("⚠️ **Требуют внимания (оценка < 3):**");
    for (const [manager, count] of lowRatedEntries) {
      lines.push(`• ${manager}: ${count} ${pluralizeCalls(count)}`);
    }
  }

  return lines.join("\n");
}

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

  if (!stats || typeof stats !== "object") {
    return "❌ Ошибка: отсутствуют данные статистики";
  }
  if (!dateFrom || !dateTo) {
    return "❌ Ошибка: отсутствуют даты периода";
  }
  if (!reportType || !["daily", "weekly", "monthly"].includes(reportType)) {
    return "❌ Ошибка: неверный тип отчёта";
  }

  const typeLabel =
    reportType === "daily"
      ? "Ежедневный"
      : reportType === "weekly"
        ? "Еженедельный"
        : "Ежемесячный";

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

  const totalMinutes = Math.round(
    (totals.incomingTotalDurationSec + totals.outgoingTotalDurationSec) / 60,
  );

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

  // Таблица KPI сотрудников - простой текст без HTML тегов
  lines.push("📈 <b>KPI сотрудников:</b>");
  lines.push("");

  if (includeKpi) {
    // Формат списка вместо таблицы для лучшей читаемости в Telegram
    for (const s of managers) {
      const totalMinutes = Math.round(
        (s.incomingAvgDurationSec * s.incomingCount +
          s.outgoingAvgDurationSec * s.outgoingCount) /
          60,
      );

      lines.push(`👤 <b>${escapeHtml(s.name)}</b>`);
      lines.push(`   📞 Звонков: <b>${s.totalCount}</b> | ⏱️ Минут: <b>${totalMinutes}</b>`);
      lines.push(`   💰 Оклад: <b>${s.kpiBaseSalary !== null && s.kpiBaseSalary !== undefined ? formatValue(s.kpiBaseSalary) : '—'} ₽</b> | 🎁 Бонус: <b>${s.kpiCalculatedBonus !== null && s.kpiCalculatedBonus !== undefined ? formatValue(s.kpiCalculatedBonus) : '—'} ₽</b>`);
      lines.push(`   💵 Итого: <b>${s.kpiTotalSalary !== null && s.kpiTotalSalary !== undefined ? formatValue(s.kpiTotalSalary) : '—'} ₽</b>`);
      lines.push("");
    }
  } else {
    // Формат списка без KPI
    for (const s of managers) {
      const totalMinutes = Math.round(
        (s.incomingAvgDurationSec * s.incomingCount +
          s.outgoingAvgDurationSec * s.outgoingCount) /
          60,
      );

      lines.push(`👤 <b>${escapeHtml(s.name)}</b>`);
      lines.push(`   📞 Звонков: <b>${s.totalCount}</b> | ⏱️ Минут: <b>${totalMinutes}</b>`);
      lines.push("");
    }
  }

  lines.push("");

  // Итоги по всем
  lines.push("📊 <b>Итоги по всем сотрудникам:</b>");
  lines.push(`• Всего звонков: <b>${totals.totalCount}</b>`);
  lines.push(`• Всего минут: <b>${totalMinutes}</b>`);

  if (isManagerReport && totals.totalCount > 0) {
    lines.push(
      `• Оценено: <b>${totals.evaluatedCount}/${totals.totalCount}</b>`,
    );
  }
  if (overall.avgManagerScore != null) {
    lines.push(
      `• Ср. оценка качества: <b>${formatScore(overall.avgManagerScore)}</b> ⭐`,
    );
  }

  // KPI итоги
  if (includeKpi) {
    lines.push(`• Общий оклад: <b>${totals.totalBaseSalary > 0 ? formatValue(totals.totalBaseSalary) : '—'} ₽</b>`);
    lines.push(
      `• Целевой бонус: <b>${totals.totalTargetBonus > 0 ? formatValue(totals.totalTargetBonus) : '—'} ₽</b>`,
    );
    lines.push(
      `• Начисленный бонус: <b>${totals.totalCalculatedBonus > 0 ? formatValue(totals.totalCalculatedBonus) : '—'} ₽</b>`,
    );
    lines.push(
      `• Итого к выплате: <b>${totals.totalSalary > 0 ? formatValue(totals.totalSalary) : '—'} ₽</b>`,
    );
  }

  if (isManagerReport && lowRatedEntries.length > 0) {
    lines.push("");
    lines.push("⚠️ <b>Требуют внимания (оценка &lt; 3)</b>");
    for (const [manager, count] of lowRatedEntries.slice(0, 10)) {
      lines.push(
        `• <b>${escapeHtml(manager)}</b>: ${count} ${pluralizeCalls(count)}`,
      );
    }
  }

  return lines.join("\n");
}

export function splitTelegramHtmlMessage(
  message: string,
  maxLength = 4000,
): string[] {
  if (!message) return [""];
  if (!Number.isFinite(maxLength) || maxLength <= 0) {
    throw new RangeError("maxLength должен быть положительным числом");
  }
  if (message.length <= maxLength) return [message];

  const parts: string[] = [];
  const lines = message.split("\n");
  let current = "";

  const pushCurrent = () => {
    if (current.length > 0) {
      parts.push(current);
      current = "";
    }
  };

  for (const line of lines) {
    const candidate = current.length > 0 ? `${current}\n${line}` : line;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    pushCurrent();
    if (line.length <= maxLength) {
      current = line;
      continue;
    }

    const findSafeEnd = (text: string, start: number, intendedEnd: number) => {
      if (intendedEnd >= text.length) return intendedEnd;
      const chunk = text.slice(start, intendedEnd);

      const lastOpenTag = chunk.lastIndexOf("<");
      const lastCloseTag = chunk.lastIndexOf(">");
      if (lastOpenTag > lastCloseTag) {
        const safeTagEnd = chunk.lastIndexOf(">");
        if (safeTagEnd >= 0) {
          return start + safeTagEnd + 1;
        }
      }

      const lastOpenEntity = chunk.lastIndexOf("&");
      const lastCloseEntity = chunk.lastIndexOf(";");
      if (lastOpenEntity > lastCloseEntity) {
        const safeEntityEnd = chunk.lastIndexOf(";");
        if (safeEntityEnd >= 0) {
          return start + safeEntityEnd + 1;
        }
      }

      return intendedEnd;
    };

    let start = 0;
    while (start < line.length) {
      const intendedEnd = Math.min(start + maxLength, line.length);
      let end = findSafeEnd(line, start, intendedEnd);

      if (end <= start) {
        end = Math.min(start + maxLength, line.length);
      }

      parts.push(line.slice(start, end));
      start = end;
    }
  }

  pushCurrent();
  return parts.length > 0 ? parts : [message.slice(0, maxLength)];
}
