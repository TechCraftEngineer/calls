import { systemRepository, usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

export const deleteUser = workspaceAdminProcedure
  .input(z.object({ user_id: z.string() }))
  .handler(async ({ input, context }) => {
    const user = await usersService.getUser(input.user_id);
    if (!user)
      throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
    const adminId = (context.user as Record<string, unknown>).id as string;
    if (adminId === input.user_id)
      throw new ORPCError("BAD_REQUEST", {
        message: "Нельзя удалить свой аккаунт",
      });
    if (context.workspaceId) {
      await context.workspacesService.removeMember(
        context.workspaceId,
        input.user_id,
      );
    } else {
      if (!(await usersService.deleteUser(input.user_id)))
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Не удалось удалить пользователя",
        });
    }
    await systemRepository.addActivityLog(
      "info",
      context.workspaceId
        ? `Пользователь исключён из рабочего пространства: ${user.email}`
        : `Пользователь удалён: ${user.email}`,
      (context.user as Record<string, unknown>).email as string,
    );
    return {
      success: true,
      message: context.workspaceId
        ? `Пользователь ${user.email} исключён из рабочего пространства`
        : `Пользователь ${user.email} удалён`,
    };
  });
