import { usersService } from "@calls/db";
import { canAccessUser } from "../utils";
import { uuidSchema } from "@calls/shared";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { ORPCError } from "@orpc/server";

export const disconnectMax = workspaceProcedure
  .input(z.object({ user_id: uuidSchema }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });
    if (!(await usersService.disconnectMax(input.user_id)))
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось отключить MAX",
      });
    return { success: true };
  });
