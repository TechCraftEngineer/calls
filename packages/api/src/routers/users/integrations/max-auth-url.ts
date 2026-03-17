import { randomBytes } from "node:crypto";
import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { canAccessUser } from "../utils";

export const maxAuthUrl = workspaceProcedure
  .input(z.object({ user_id: z.string() }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });
    if (context.workspaceId == null)
      throw new ORPCError("BAD_REQUEST", {
        message: "Требуется активное рабочее пространство",
      });
    const user = await usersService.getUser(input.user_id);
    if (!user)
      throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
    const token = randomBytes(16).toString("base64url");
    if (
      !(await usersService.saveMaxConnectToken(
        input.user_id,
        context.workspaceId,
        token,
      ))
    )
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось сохранить токен",
      });
    return {
      manual_instruction: `Отправьте боту команду: /start ${token}`,
      token,
    };
  });
