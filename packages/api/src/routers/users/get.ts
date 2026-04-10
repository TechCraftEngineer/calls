import { usersService } from "@calls/db";
import { userIdSchema } from "@calls/shared";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { canAccessUser } from "./utils";

export const get = workspaceProcedure
  .input(z.object({ userId: userIdSchema }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.userId, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });
    const user = await usersService.getUser(input.userId);
    if (!user) throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
    return user;
  });
