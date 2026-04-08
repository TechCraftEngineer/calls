import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { userIdSchema } from "@calls/shared";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { updateReportManagedUsersSettingsSchema } from "../schemas";
import { canAccessUser, logUpdate } from "../utils";

export const updateReportManagedUsersSettings = workspaceProcedure
  .input(
    z.object({
      userId: userIdSchema,
      data: updateReportManagedUsersSettingsSchema,
    }),
  )
  .handler(async ({ input, context }) => {
    if (context.workspaceId == null)
      throw new ORPCError("BAD_REQUEST", {
        message: "Требуется активное рабочее пространство",
      });

    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.userId, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });

    const user = await usersService.getUser(input.userId);
    if (!user) throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });

    try {
      await usersService.updateUserReportKpiSettings(input.userId, context.workspaceId, {
        // Флаг "по менеджерам" зависит от наличия выбранных пользователей.
        telegramManagerReport: input.data.reportManagedUserIds.length > 0,
        reportManagedUserIds: JSON.stringify(input.data.reportManagedUserIds),
      });

      await logUpdate(
        "report managed users settings updated",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ?? "unknown",
        undefined,
        context.workspaceId,
      );

      return await usersService.getUser(input.userId);
    } catch (error) {
      await logUpdate(
        "update report managed users settings",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ?? "unknown",
        error,
        context.workspaceId,
      );
      throw error;
    }
  });
