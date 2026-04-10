import { usersService } from "@calls/db";
import { userIdSchema } from "@calls/shared";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { canAccessUser } from "../utils";

export const disconnectTelegram = workspaceProcedure
  .input(z.object({ userId: userIdSchema }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.userId, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });
    if (!(await usersService.disconnectTelegram(input.userId)))
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось отключить Telegram",
      });
    return { success: true };
  });
