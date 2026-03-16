import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { updateBasicInfoSchema } from "./schemas";
import { canAccessUser, logUpdate } from "./utils";

export const updateBasicInfo = workspaceProcedure
  .input(z.object({ user_id: z.string(), data: updateBasicInfoSchema }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });

    const user = await usersService.getUser(input.user_id);
    if (!user)
      throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });

    try {
      await usersService.updateUserName(input.user_id, {
        givenName: input.data.givenName.trim(),
        familyName: input.data.familyName?.trim() || "",
      });

      if (input.data.internalExtensions !== undefined) {
        await usersService.updateUserInternalExtensions(
          input.user_id,
          input.data.internalExtensions.trim() || null,
        );
      }

      if (input.data.mobilePhones !== undefined) {
        await usersService.updateUserMobilePhones(
          input.user_id,
          input.data.mobilePhones.trim() || null,
        );
      }

      await logUpdate(
        "basic info updated",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update user basic info",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
        error,
      );
      throw error;
    }
  });
