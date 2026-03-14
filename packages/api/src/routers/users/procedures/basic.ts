import { systemRepository, usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure, workspaceProcedure } from "../../../orpc";
import { userCreateSchema } from "../schemas";
import { canAccessUser } from "../utils";

export const list = workspaceAdminProcedure.handler(async ({ context }) => {
  const { workspaceId, workspacesService } = context;
  try {
    const rows = await workspacesService.getMembers(workspaceId);
    return rows.map((r: { user: Record<string, unknown> }) => {
      const u = r.user;
      return {
        id: u.id,
        username: u.username ?? u.email,
        name: u.name ?? "",
        givenName: u.givenName,
        familyName: u.familyName,
        internalExtensions: u.internalExtensions,
        mobilePhones: u.mobilePhones,
        created_at: (u.createdAt as Date)?.toISOString?.() ?? u.createdAt,
        telegramChatId: u.telegramChatId,
      };
    });
  } catch (error) {
    console.error("[Users] Error in list workspace members:", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Не удалось загрузить список пользователей",
    });
  }
});

export const get = workspaceProcedure
  .input(z.object({ user_id: z.string() }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });
    const user = await usersService.getUser(input.user_id);
    if (!user)
      throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
    return user;
  });

export const create = workspaceAdminProcedure
  .input(userCreateSchema)
  .handler(async ({ input, context }) => {
    const existing = await usersService.getUserByUsername(input.username);
    if (existing)
      throw new ORPCError("CONFLICT", {
        message: "Пользователь с таким логином уже существует",
      });
    const id = await usersService.createUser({
      username: input.username,
      password: input.password,
      givenName: input.givenName,
      familyName: input.familyName ?? "",
      internalExtensions: input.internalExtensions ?? null,
      mobilePhones: input.mobilePhones ?? null,
    });
    if (context.workspaceId) {
      await context.workspacesService.addMember({
        workspaceId: context.workspaceId,
        userId: id,
        role: "member",
      });
    }
    await systemRepository.addActivityLog(
      "info",
      `User created: ${input.username}`,
      (context.user as Record<string, unknown>).username as string,
    );
    const user = await usersService.getUser(id);
    if (!user)
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось создать пользователя",
      });
    return user;
  });

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
        ? `Пользователь исключён из рабочего пространства: ${user.username}`
        : `Пользователь удалён: ${user.username}`,
      (context.user as Record<string, unknown>).username as string,
    );
    return {
      success: true,
      message: context.workspaceId
        ? `Пользователь ${user.username} исключён из рабочего пространства`
        : `Пользователь ${user.username} удалён`,
    };
  });

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
