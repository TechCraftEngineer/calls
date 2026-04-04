/**
 * Утилиты для форматирования отчетов
 */

import { z } from "zod";

// Zod schema для валидации параметров отчета
const ReportParamsSchema = z.object({
  stats: z.record(z.string(), z.any()),
  dateFrom: z.date(),
  dateTo: z.date(),
  reportType: z.enum(["daily", "weekly", "monthly"]),
});

export type ValidatedReportParams = z.infer<typeof ReportParamsSchema>;

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

export function getReportTypeLabel(): string {
  return "Звонки";
}

export function validateReportParams(params: unknown): string | null {
  const result = ReportParamsSchema.safeParse(params);

  if (!result.success) {
    const error = result.error;
    if (error.issues.length > 0) {
      const firstIssue = error.issues[0];
      if (!firstIssue) return "❌ Ошибка: неверные параметры отчета";

      const field = firstIssue.path.join(".");
      const message = firstIssue.message;

      // Определяем тип ошибки на основе сообщения
      if (message.includes("Expected") && message.includes("date")) {
        return `❌ Ошибка: поле '${field}' должно быть датой`;
      }
      if (message.includes("Expected") && message.includes("object")) {
        return `❌ Ошибка: поле '${field}' должно быть объектом`;
      }
      if (
        message.includes("Invalid") &&
        (message.includes("enum") || message.includes("literal"))
      ) {
        return `❌ Ошибка: поле '${field}' должно быть одним из: daily, weekly, monthly`;
      }

      return `❌ Ошибка: поле '${field}' - ${message}`;
    }
    return "❌ Ошибка: неверные параметры отчета";
  }

  return null;
}
