import { settingsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";
import { ftpCredentialsSchema } from "./schemas";

const updateFtpSchema = z
  .object({
    enabled: z.boolean(),
    host: z.string(),
    user: z.string(),
    password: z.string(),
  })
  .refine(
    (data) => {
      const hasAny = [data.host, data.user, data.password].some(
        (v) => v && v.trim() !== "",
      );
      const hasAll = [data.host, data.user, data.password].every(
        (v) => v && v.trim() !== "",
      );
      return !hasAny || hasAll;
    },
    { message: "Заполните все поля подключения" },
  );

export const updateFtp = workspaceAdminProcedure
  .input(updateFtpSchema)
  .handler(async ({ input, context }) => {
    const { workspaceId } = context;
    const { enabled, host, user, password } = input;

    if (host.trim() && user.trim() && password) {
      try {
        ftpCredentialsSchema.parse({ host, user, password });
      } catch (error) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Ошибка валидации FTP: ${(error as Error).message}`,
        });
      }
    }

    const username =
      (context.user as Record<string, unknown>)?.username ?? "system";
    await settingsService.updateFtpSettings(
      enabled,
      host,
      user,
      password,
      workspaceId,
      String(username),
    );

    return { success: true, message: "FTP настройки сохранены" };
  });
