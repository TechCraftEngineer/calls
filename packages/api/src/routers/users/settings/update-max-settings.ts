import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { userIdSchema } from "@calls/shared";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { updateMaxSettingsSchema } from "../schemas";
import { canAccessUser, logUpdate } from "../utils";

export const updateMaxSettings = workspaceProcedure
  .input(z.object({ userId: userIdSchema, data: updateMaxSettingsSchema }))
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
        maxChatId: input.data.maxChatId,
        maxDailyReport: input.data.maxDailyReport,
        maxManagerReport: input.data.maxManagerReport,
      });

      await logUpdate(
        "max settings updated",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ?? "unknown",
        undefined,
        context.workspaceId,
      );

      return await usersService.getUser(input.userId);
    } catch (error) {
      await logUpdate(
        "update user max settings",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ?? "unknown",
        error,
        context.workspaceId,
      );
      throw error;
    }
  });
