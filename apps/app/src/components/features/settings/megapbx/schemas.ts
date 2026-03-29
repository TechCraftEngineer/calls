import { isValidCalendarIsoDate } from "@calls/shared";
import { z } from "zod";
import { WEBHOOK_SECRET_BYTES } from "./utils";

const WEBHOOK_SECRET_MIN_LENGTH = WEBHOOK_SECRET_BYTES * 2; // hex encoding doubles the length

export const accessFormSchema = z.object({
  baseUrl: z
    .string()
    .trim()
    .refine(
      (value) => {
        if (!value) return true;
        const urlCandidate =
          value.startsWith("http://") || value.startsWith("https://")
            ? value
            : `https://${value}`;
        try {
          new URL(urlCandidate);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Некорректный URL. Укажите корректный URL или домен." },
    ),
  apiKey: z.string().trim().optional(),
  syncFromDate: z
    .string()
    .trim()
    .optional()
    .refine((v) => v === undefined || v === "" || isValidCalendarIsoDate(v), {
      message:
        "Некорректная дата. Используйте формат YYYY-MM-DD и реальную дату календаря.",
    }),
});

export type AccessFormData = z.infer<typeof accessFormSchema>;

export const syncOptionsFormSchema = z.object({
  syncEmployees: z.boolean(),
  syncNumbers: z.boolean(),
  syncCalls: z.boolean(),
  syncRecordings: z.boolean(),
  webhooksEnabled: z.boolean(),
});

export type SyncOptionsFormData = z.infer<typeof syncOptionsFormSchema>;

export const webhookFormSchema = z.object({
  webhookSecret: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z
    .string()
    .min(
      WEBHOOK_SECRET_MIN_LENGTH,
      `Секрет должен содержать минимум ${WEBHOOK_SECRET_MIN_LENGTH} символов`,
    )
    .optional()),
});

export type WebhookFormData = z.infer<typeof webhookFormSchema>;
