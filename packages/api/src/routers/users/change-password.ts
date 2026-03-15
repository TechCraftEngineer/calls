import { systemRepository, usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

export const changePassword = workspaceAdminProcedure
  .input(
    z.object({
      user_id: z.string(),
      new_password: z
        .string()
        .min(8, "Пароль должен содержать минимум 8 символов"),
      confirm_password: z.string().min(1),
    }),
  )
  .handler(async ({ input, context }) => {
    const user = await usersService.getUser(input.user_id);
    if (!user)
      throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });

    if (input.new_password !== input.confirm_password)
      throw new ORPCError("BAD_REQUEST", {
        message: "Пароли не совпадают",
      });

    try {
      // Dynamic import - @calls/app-server not in api deps (circular); resolved at runtime
      // @ts-expect-error - module resolved when app-server runs
      const { auth } = await import("@calls/app-server/auth");

      await auth.api.setUserPassword({
        body: {
          userId: input.user_id,
          newPassword: input.new_password,
        },
      });

      await systemRepository.addActivityLog(
        "info",
        `Password changed for user: ${user.username}`,
        (context.user as Record<string, unknown>).username as string,
      );

      return { success: true, message: "Password changed successfully" };
    } catch (error) {
      console.error("[Users] Error changing password:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось изменить пароль",
      });
    }
  });
