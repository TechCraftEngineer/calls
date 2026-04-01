/**
 * Утилиты для форматирования отчетов
 */

export function formatValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

export function formatScore(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Русская склонение: 1 звонок, 2 звонка, 5 звонков */
export function pluralizeCalls(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return "звонков";
  if (mod10 === 1) return "звонок";
  if (mod10 >= 2 && mod10 <= 4) return "звонка";
  return "звонков";
}

export function getReportTypeLabel(reportType: "daily" | "weekly" | "monthly"): string {
  return reportType === "daily"
    ? "Ежедневный"
    : reportType === "weekly"
      ? "Еженедельный"
      : "Ежемесячный";
}

export function validateReportParams(params: {
  stats?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
  reportType?: unknown;
}): string | null {
  if (!params.stats || typeof params.stats !== "object") {
    return "❌ Ошибка: отсутствуют данные статистики";
  }

  if (!params.dateFrom || !params.dateTo) {
    return "❌ Ошибка: отсутствуют даты периода";
  }

  if (!params.reportType || !["daily", "weekly", "monthly"].includes(params.reportType as string)) {
    return "❌ Ошибка: неверный тип отчёта";
  }

  return null;
}
