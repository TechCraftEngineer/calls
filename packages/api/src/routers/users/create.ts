import { systemRepository, usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../orpc";
import { userCreateSchema } from "./schemas";

export const create = workspaceAdminProcedure
  .input(userCreateSchema)
  .handler(async ({ input, context }) => {
    const id = await usersService.createUser(
      {
        email: input.email,
        password: input.password,
        givenName: input.givenName,
        familyName: input.familyName ?? "",
        internalExtensions: input.internalExtensions ?? null,
        mobilePhones: input.mobilePhones ?? null,
      },
      context.workspaceId,
      (context.user as Record<string, unknown>).email as string,
    );
    if (context.workspaceId) {
      await context.workspacesService.addMember({
        workspaceId: context.workspaceId,
        userId: id,
        role: "member",
      });
    }
    await systemRepository.addActivityLog(
      "INFO",
      `User created: ${input.email}`,
      (context.user as Record<string, unknown>).email as string,
      context.workspaceId,
    );
    const user = await usersService.getUser(id);
    if (!user) {
      await systemRepository.addActivityLog(
        "ERROR",
        `Failed to retrieve created user: ${input.email} (ID: ${id})`,
        (context.user as Record<string, unknown>).email as string,
        context.workspaceId,
      );
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось создать пользователя. Пожалуйста, попробуйте снова.",
      });
    }
    return user;
  });
