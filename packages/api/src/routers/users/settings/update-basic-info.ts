import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { userIdSchema } from "@calls/shared";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { updateBasicInfoSchema } from "../schemas";
import { canAccessUser, logUpdate } from "../utils";

export const updateBasicInfo = workspaceProcedure
  .input(z.object({ userId: userIdSchema, data: updateBasicInfoSchema }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.userId, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });

    const user = await usersService.getUser(input.userId);
    if (!user) throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });

    try {
      await usersService.updateUserName(input.userId, {
        givenName: input.data.givenName.trim(),
        familyName: input.data.familyName?.trim() || "",
      });

      if (input.data.internalExtensions !== undefined) {
        await usersService.updateUserInternalExtensions(
          input.userId,
          input.data.internalExtensions.trim() || null,
        );
      }

      if (input.data.mobilePhones !== undefined) {
        await usersService.updateUserMobilePhones(
          input.userId,
          input.data.mobilePhones.trim() || null,
        );
      }

      await logUpdate(
        "basic info updated",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ?? "unknown",
        undefined,
        context.workspaceId,
      );

      return await usersService.getUser(input.userId);
    } catch (error) {
      await logUpdate(
        "update user basic info",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ?? "unknown",
        error,
        context.workspaceId,
      );
      throw error;
    }
  });
