/**
 * Утилиты для работы с отчетами
 */

import { format } from "date-fns";
import { ru } from "date-fns/locale";

export type ReportType = "daily" | "weekly" | "monthly";

/**
 * Формирует subject для email отчета на основе типа отчета и дат
 */
export function formatReportSubject(reportType: ReportType, dateFrom: Date, dateTo: Date): string {
  const formatDate = (d: Date) => format(d, "dd.MM.yyyy", { locale: ru });

  if (reportType === "daily") {
    const dayOfWeek = format(dateFrom, "EEEE", { locale: ru });
    const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    return `Отчёт по звонкам за ${capitalizedDay} ${formatDate(dateFrom)}`;
  }

  const typeLabelMap: Record<Exclude<ReportType, "daily">, string> = {
    weekly: "Еженедельный",
    monthly: "Ежемесячный",
  };

  const typeLabel = typeLabelMap[reportType];
  if (!typeLabel) {
    throw new Error(`Неизвестный тип отчёта: ${reportType}`);
  }

  return `Отчёт по звонкам (${typeLabel}): ${formatDate(dateFrom)} — ${formatDate(dateTo)}`;
}
