import { settingsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";
import { ftpCredentialsSchema } from "../schemas";

const updateFtpSchema = z
  .object({
    enabled: z.boolean(),
    host: z.string(),
    user: z.string(),
    /** Пустой пароль = оставить существующий. Новый пароль — только при явном вводе. */
    password: z.string(),
    /** С какой даты выгружать записи (YYYY-MM-DD) */
    syncFromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    /** Номера телефонов, исключённые из загрузки и анализа */
    excludePhoneNumbers: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      const hasHost = data.host.trim() !== "";
      const hasUser = data.user.trim() !== "";
      return hasHost === hasUser;
    },
    { message: "Заполните Host и User вместе" },
  );

export const updateFtp = workspaceAdminProcedure
  .input(updateFtpSchema)
  .handler(async ({ input, context }) => {
    const { workspaceId } = context;
    const { enabled, host, user, password, syncFromDate, excludePhoneNumbers } = input;

    const passwordToSave = password.trim() || null;
    if (host.trim() && user.trim() && passwordToSave) {
      try {
        ftpCredentialsSchema.parse({ host, user, password: passwordToSave });
      } catch (error) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Ошибка валидации FTP: ${(error as Error).message}`,
        });
      }
    }

    const username = (context.user as Record<string, unknown>)?.email ?? "system";
    const excludeList = excludePhoneNumbers
      ? excludePhoneNumbers.map((n) => n.trim()).filter(Boolean)
      : undefined;
    await settingsService.updateFtpSettings(
      enabled,
      host,
      user,
      passwordToSave,
      workspaceId,
      String(username),
      syncFromDate,
      excludeList,
    );

    return { success: true, message: "FTP настройки сохранены" };
  });
