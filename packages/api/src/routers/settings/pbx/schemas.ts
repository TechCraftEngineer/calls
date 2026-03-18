import { z } from "zod";

export const pbxSettingsSchema = z.object({
  enabled: z.boolean(),
  baseUrl: z.string().trim(),
  apiKey: z.string().trim(),
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
