import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { updateReportSettingsSchema } from "../schemas";
import { canAccessUser, logUpdate } from "../utils";

export const updateReportSettings = workspaceProcedure
  .input(z.object({ user_id: z.string(), data: updateReportSettingsSchema }))
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
      await usersService.updateUserReportKpiSettings(
        input.user_id,
        context.workspaceId!,
        {
          reportIncludeCallSummaries: input.data.report_include_call_summaries,
          reportDetailed: input.data.report_detailed,
          reportIncludeAvgValue: input.data.report_include_avg_value,
          reportIncludeAvgRating: input.data.report_include_avg_rating,
        },
      );

      await logUpdate(
        "report settings updated",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
        undefined,
        context.workspaceId,
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update user report settings",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
        error,
        context.workspaceId,
      );
      throw error;
    }
  });
