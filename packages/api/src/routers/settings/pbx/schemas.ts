import { isValidCalendarIsoDate } from "@calls/shared";
import { z } from "zod";

export const pbxSettingsSchema = z.object({
  enabled: z.boolean(),
  baseUrl: z.string().trim(),
  apiKey: z.string().trim(),
  syncFromDate: z.string().trim().optional().default(""),
  excludePhoneNumbers: z
    .array(z.string().regex(/^\d+$/))
    .optional()
    .default([]),
  webhookSecret: z.string().trim().optional().default(""),
  ftpHost: z.string().trim().optional().default(""),
  ftpUser: z.string().trim().optional().default(""),
  ftpPassword: z.string().trim().optional().default(""),
  syncEmployees: z.boolean().default(true),
  syncNumbers: z.boolean().default(true),
  syncCalls: z.boolean().default(true),
  syncRecordings: z.boolean().default(false),
  webhooksEnabled: z.boolean().default(false),
});

export const pbxAccessSchema = z.object({
  enabled: z.boolean(),
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
      { message: "Некорректный baseUrl. Укажите корректный URL или домен." },
    ),
  apiKey: z.string().trim().optional(),
  syncFromDate: z
    .string()
    .trim()
    .optional()
    .refine((v) => v === undefined || v === "" || isValidCalendarIsoDate(v), {
      message:
        "Некорректная дата импорта. Используйте формат YYYY-MM-DD и реальную дату.",
    }),
});

export const pbxSyncOptionsSchema = z.object({
  syncEmployees: z.boolean(),
  syncNumbers: z.boolean(),
  syncCalls: z.boolean(),
  syncRecordings: z.boolean(),
  webhooksEnabled: z.boolean(),
});

export const pbxExcludePhoneNumbersSchema = z.object({
  excludePhoneNumbers: z.array(z.string().regex(/^\d+$/)).default([]),
});

export const pbxWebhookSchema = z.object({
  webhookSecret: z.string().trim().optional(),
});

/** Только то, что нужно для проверки соединения с API (остальное подтягивается из БД). */
export const testPbxInputSchema = z.object({
  baseUrl: z.string().trim().optional(),
  apiKey: z.string().trim().optional(),
});

export const pbxLinkSchema = z
  .object({
    targetType: z.enum(["employee", "number"]),
    targetExternalId: z.string().min(1),
    userId: z.string().optional().nullable(),
    invitationId: z.string().optional().nullable(),
  })
  .refine((value) => Boolean(value.userId || value.invitationId), {
    message: "Нужно указать пользователя или приглашение",
  })
  .refine((value) => !(value.userId && value.invitationId), {
    message: "Можно указать только пользователя или приглашение",
  });

export const pbxUnlinkSchema = z.object({
  targetType: z.enum(["employee", "number"]),
  targetExternalId: z.string().min(1),
});
