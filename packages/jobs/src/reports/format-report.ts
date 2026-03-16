/**
 * Форматирование текста отчёта по звонкам для Telegram
 */

export interface ManagerStats {
  name: string;
  internalNumber: string | null;
  incoming: { count: number; duration: number };
  outgoing: { count: number; duration: number };
}

export interface FormatReportParams {
  stats: Record<string, ManagerStats>;
  dateFrom: string;
  dateTo: string;
  reportType: "daily" | "weekly" | "monthly";
  isManagerReport: boolean;
  workspaceName?: string;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 мин";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (s > 0) return `${m} мин ${s} сек`;
  return `${m} мин`;
}

export function formatTelegramReport(params: FormatReportParams): string {
  const {
    stats,
    dateFrom,
    dateTo,
    reportType,
    isManagerReport,
    workspaceName,
  } = params;

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

  let totalIncoming = 0;
  let totalOutgoing = 0;
  let totalInDuration = 0;
  let totalOutDuration = 0;

  for (const [, s] of entries) {
    totalIncoming += s.incoming.count;
    totalOutgoing += s.outgoing.count;
    // duration в stats — средняя; для общей длительности нужно среднее * количество
    totalInDuration += s.incoming.duration * s.incoming.count;
    totalOutDuration += s.outgoing.duration * s.outgoing.count;
  }

  for (const [key, s] of entries) {
    const inCount = s.incoming.count;
    const outCount = s.outgoing.count;
    // duration в stats — средняя длительность на один звонок
    const inDur = s.incoming.duration;
    const outDur = s.outgoing.duration;
    const inDurStr = inCount > 0 ? formatDuration(inDur) : "—";
    const outDurStr = outCount > 0 ? formatDuration(outDur) : "—";

    lines.push(`👤 ${key}`);
    lines.push(`   Входящие: ${inCount} (${inDurStr})`);
    lines.push(`   Исходящие: ${outCount} (${outDurStr})`);
    lines.push("");
  }

  lines.push("───");
  lines.push(`Всего: входящие ${totalIncoming}, исходящие ${totalOutgoing}`);

  return lines.join("\n");
}
