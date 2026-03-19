/**
 * Форматирование текста отчёта по звонкам для Telegram
 */

export interface ManagerStats {
  name: string;
  internalNumber: string | null;
  incoming: { count: number; duration: number; totalDuration?: number };
  outgoing: { count: number; duration: number; totalDuration?: number };
  avgManagerScore?: number | null;
  avgValueScore?: number | null;
  evaluatedCount?: number;
}

export interface FormatReportParams {
  stats: Record<string, ManagerStats>;
  dateFrom: string;
  dateTo: string;
  reportType: "daily" | "weekly" | "monthly";
  isManagerReport: boolean;
  workspaceName?: string;
  /** Показывать среднюю оценку и сумму (только для админ-отчёта) */
  includeAvgRating?: boolean;
  includeAvgValue?: boolean;
  /** Звонки с низкой оценкой по менеджерам (managerScore < 3) */
  lowRatedCalls?: Record<string, number>;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 мин";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (s > 0) return `${m} мин ${s} сек`;
  return `${m} мин`;
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

interface PreparedStats {
  name: string;
  incomingCount: number;
  outgoingCount: number;
  totalCount: number;
  incomingAvgDurationSec: number;
  outgoingAvgDurationSec: number;
  avgManagerScore?: number | null;
  avgValueScore?: number | null;
  evaluatedCount: number;
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
  };
} {
  const managers: PreparedStats[] = [];
  let incomingCount = 0;
  let outgoingCount = 0;
  let incomingTotalDurationSec = 0;
  let outgoingTotalDurationSec = 0;
  let evaluatedCount = 0;

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

    managers.push({
      name,
      incomingCount: inCount,
      outgoingCount: outCount,
      totalCount: total,
      incomingAvgDurationSec: inAvgSec,
      outgoingAvgDurationSec: outAvgSec,
      avgManagerScore: raw.avgManagerScore,
      avgValueScore: raw.avgValueScore,
      evaluatedCount: evalCount,
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
    },
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
    includeAvgRating = false,
    includeAvgValue = false,
    lowRatedCalls = {},
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
  lines.push(`📅 ${dateFrom} — ${dateTo}`);
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
  for (const s of managers) {
    const inDurStr =
      s.incomingCount > 0 ? formatDuration(s.incomingAvgDurationSec) : "—";
    const outDurStr =
      s.outgoingCount > 0 ? formatDuration(s.outgoingAvgDurationSec) : "—";
    lines.push(`👤 ${s.name}`);
    lines.push(`   Входящие: ${s.incomingCount} (${inDurStr})`);
    lines.push(`   Исходящие: ${s.outgoingCount} (${outDurStr})`);
    if (isManagerReport) {
      if (includeAvgRating && s.avgManagerScore != null) {
        lines.push(`   ⭐ Ср. оценка: ${formatScore(s.avgManagerScore)}`);
      }
      if (includeAvgValue && s.avgValueScore != null) {
        lines.push(`   💰 Ср. сумма: ${formatValue(s.avgValueScore)} ₽`);
      }
    }
    lines.push("");
  }

  lines.push("───");
  lines.push(
    `Всего: входящие ${totals.incomingCount}, исходящие ${totals.outgoingCount}`,
  );

  if (isManagerReport && totals.totalCount > 0) {
    lines.push(
      `Оценено: ${totals.evaluatedCount} из ${totals.totalCount} звонков`,
    );
  }

  const lowRatedEntries = Object.entries(lowRatedCalls).filter(
    ([, n]) => n > 0,
  );
  if (isManagerReport && lowRatedEntries.length > 0) {
    lines.push("");
    lines.push("─── Требуют внимания (оценка < 3) ───");
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
    includeAvgRating = false,
    includeAvgValue = false,
    lowRatedCalls = {},
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
  if (managers.length === 0) {
    return [
      `📊 <b>${typeLabel} отчёт по звонкам</b>`,
      `📅 <b>Период:</b> ${escapeHtml(dateFrom)} — ${escapeHtml(dateTo)}`,
      workspaceName ? `🏢 <b>Компания:</b> ${escapeHtml(workspaceName)}` : "",
      "",
      "За выбранный период звонков не найдено.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const avgInDuration =
    totals.incomingCount > 0
      ? totals.incomingTotalDurationSec / totals.incomingCount
      : 0;
  const avgOutDuration =
    totals.outgoingCount > 0
      ? totals.outgoingTotalDurationSec / totals.outgoingCount
      : 0;

  const topManagers = managers.slice(0, 3);
  const lowRatedEntries = Object.entries(lowRatedCalls)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  const lines: string[] = [];
  lines.push(`📊 <b>${typeLabel} отчёт по звонкам</b>`);
  lines.push(
    `📅 <b>Период:</b> ${escapeHtml(dateFrom)} — ${escapeHtml(dateTo)}`,
  );
  if (workspaceName) {
    lines.push(`🏢 <b>Компания:</b> ${escapeHtml(workspaceName)}`);
  }
  lines.push("");

  lines.push("🧾 <b>Итоги</b>");
  lines.push(`• Всего звонков: <b>${totals.totalCount}</b>`);
  lines.push(
    `• Входящие: <b>${totals.incomingCount}</b> (ср. ${formatDuration(avgInDuration)})`,
  );
  lines.push(
    `• Исходящие: <b>${totals.outgoingCount}</b> (ср. ${formatDuration(avgOutDuration)})`,
  );
  if (isManagerReport && totals.totalCount > 0) {
    lines.push(
      `• Оценено: <b>${totals.evaluatedCount}/${totals.totalCount}</b>`,
    );
  }
  lines.push("");

  lines.push("🏆 <b>Топ менеджеров по количеству звонков</b>");
  for (const [idx, item] of topManagers.entries()) {
    const badge = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
    lines.push(
      `${badge} <b>${escapeHtml(item.name)}</b>: ${item.totalCount} ${pluralizeCalls(item.totalCount)}`,
    );
  }
  lines.push("");

  lines.push("👥 <b>Детализация по менеджерам</b>");
  for (const item of managers) {
    lines.push(`• <b>${escapeHtml(item.name)}</b>`);
    lines.push(
      `  ├ Входящие: ${item.incomingCount} (ср. ${item.incomingCount > 0 ? formatDuration(item.incomingAvgDurationSec) : "—"})`,
    );
    lines.push(
      `  ├ Исходящие: ${item.outgoingCount} (ср. ${item.outgoingCount > 0 ? formatDuration(item.outgoingAvgDurationSec) : "—"})`,
    );
    if (isManagerReport && includeAvgRating) {
      lines.push(
        `  ├ Ср. оценка качества: ${formatScore(item.avgManagerScore)} ⭐`,
      );
    }
    if (isManagerReport && includeAvgValue) {
      lines.push(
        `  └ Ср. ценность: ${formatValue(item.avgValueScore ?? NaN)} ₽`,
      );
    }
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

    let start = 0;
    while (start < line.length) {
      parts.push(line.slice(start, start + maxLength));
      start += maxLength;
    }
  }

  pushCurrent();
  return parts.length > 0 ? parts : [message.slice(0, maxLength)];
}
