import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { canAccessUser } from "./utils";

export const get = workspaceProcedure
  .input(z.object({ user_id: z.string() }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });
    const user = await usersService.getUser(input.user_id);
    if (!user) throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
    return user;
  });
