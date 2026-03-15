import { systemRepository, usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../orpc";
import { userCreateSchema } from "./schemas";

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
