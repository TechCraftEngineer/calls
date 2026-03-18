import { z } from "zod";

export const pbxMethodSchema = z.enum(["GET", "POST"]);
export const pbxAuthSchemeSchema = z.enum(["bearer", "x-api-key", "query"]);

export const pbxSettingsSchema = z.object({
  enabled: z.boolean(),
  baseUrl: z.string().trim(),
  apiKey: z.string().trim(),
  authScheme: pbxAuthSchemeSchema.default("bearer"),
  apiKeyHeader: z.string().trim().default("X-API-Key"),
  employeesPath: z.string().trim().optional().default(""),
  employeesMethod: pbxMethodSchema.default("GET"),
  employeesResultKey: z.string().trim().optional().default(""),
  numbersPath: z.string().trim().optional().default(""),
  numbersMethod: pbxMethodSchema.default("GET"),
  numbersResultKey: z.string().trim().optional().default(""),
  callsPath: z.string().trim().optional().default(""),
  callsMethod: pbxMethodSchema.default("GET"),
  callsResultKey: z.string().trim().optional().default(""),
  recordingsPath: z.string().trim().optional().default(""),
  recordingsMethod: pbxMethodSchema.default("GET"),
  recordingsResultKey: z.string().trim().optional().default(""),
  webhookPath: z.string().trim().optional().default(""),
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
