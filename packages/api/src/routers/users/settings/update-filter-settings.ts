import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { updateFilterSettingsSchema } from "../schemas";
import { canAccessUser, logUpdate } from "../utils";

export const updateFilterSettings = workspaceProcedure
  .input(z.object({ user_id: z.string(), data: updateFilterSettingsSchema }))
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
      await usersService.updateUserFilters(
        input.user_id,
        context.workspaceId!,
        input.data.filter_exclude_answering_machine ?? false,
        input.data.filter_min_duration ?? 0,
        input.data.filter_min_replicas ?? 0,
      );

      await logUpdate(
        "filter settings updated",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
        undefined,
        context.workspaceId,
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update user filter settings",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
        error,
        context.workspaceId,
      );
      throw error;
    }
  });
