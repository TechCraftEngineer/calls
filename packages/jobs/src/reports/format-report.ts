/**
 * Форматирование текста отчёта по звонкам для Telegram
 */

export interface ManagerStats {
  name: string;
  internalNumber: string | null;
  incoming: { count: number; duration: number };
  outgoing: { count: number; duration: number };
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

/** Русская склонение: 1 звонок, 2 звонка, 5 звонков */
function pluralizeCalls(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return "звонков";
  if (mod10 === 1) return "звонок";
  if (mod10 >= 2 && mod10 <= 4) return "звонка";
  return "звонков";
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

  let totalIncoming = 0;
  let totalOutgoing = 0;
  let _totalInDuration = 0;
  let _totalOutDuration = 0;

  for (const [, s] of entries) {
    // Валидация структуры данных для подсчета totals
    if (!s || typeof s !== "object") {
      continue;
    }

    const inCount = s.incoming?.count ?? 0;
    const outCount = s.outgoing?.count ?? 0;
    const inDur = s.incoming?.duration ?? 0;
    const outDur = s.outgoing?.duration ?? 0;

    totalIncoming += inCount;
    totalOutgoing += outCount;
    // duration в stats — средняя; для общей длительности нужно среднее * количество
    _totalInDuration += inDur * inCount;
    _totalOutDuration += outDur * outCount;
  }

  let totalEvaluated = 0;
  let totalCalls = 0;

  for (const [key, s] of entries) {
    // Валидация структуры данных статистики
    if (!s || typeof s !== "object") {
      lines.push(`❌ Некорректные данные для ${key}`);
      continue;
    }

    const inCount = s.incoming?.count ?? 0;
    const outCount = s.outgoing?.count ?? 0;
    const managerTotal = inCount + outCount;
    totalCalls += managerTotal;
    totalEvaluated += s.evaluatedCount ?? 0;

    // duration в stats — средняя длительность на один звонок
    const inDur = s.incoming?.duration ?? 0;
    const outDur = s.outgoing?.duration ?? 0;
    const inDurStr = inCount > 0 ? formatDuration(inDur) : "—";
    const outDurStr = outCount > 0 ? formatDuration(outDur) : "—";

    lines.push(`👤 ${key}`);
    lines.push(`   Входящие: ${inCount} (${inDurStr})`);
    lines.push(`   Исходящие: ${outCount} (${outDurStr})`);

    if (isManagerReport) {
      if (includeAvgRating && s.avgManagerScore != null) {
        lines.push(`   ⭐ Ср. оценка: ${s.avgManagerScore.toFixed(1)}`);
      }
      if (includeAvgValue && s.avgValueScore != null) {
        lines.push(`   💰 Ср. сумма: ${formatValue(s.avgValueScore)} ₽`);
      }
    }
    lines.push("");
  }

  lines.push("───");
  lines.push(`Всего: входящие ${totalIncoming}, исходящие ${totalOutgoing}`);

  if (isManagerReport && totalCalls > 0) {
    lines.push(`Оценено: ${totalEvaluated} из ${totalCalls} звонков`);
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
