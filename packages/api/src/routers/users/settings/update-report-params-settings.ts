import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { updateReportParamsSettingsSchema } from "../schemas";
import { canAccessUser, logUpdate } from "../utils";

export const updateReportParamsSettings = workspaceProcedure
  .input(
    z.object({ user_id: z.string(), data: updateReportParamsSettingsSchema }),
  )
  .handler(async ({ input, context }) => {
    if (context.workspaceId == null)
      throw new ORPCError("BAD_REQUEST", {
        message: "Требуется активное рабочее пространство",
      });

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
        context.workspaceId,
        {
          filterExcludeAnsweringMachine:
            input.data.filterExcludeAnsweringMachine,
          filterMinDuration: input.data.filterMinDuration,
          filterMinReplicas: input.data.filterMinReplicas,

          kpiBaseSalary: input.data.kpiBaseSalary,
          kpiTargetBonus: input.data.kpiTargetBonus,
          kpiTargetTalkTimeMinutes: input.data.kpiTargetTalkTimeMinutes,
        },
      );

      await logUpdate(
        "report params settings updated",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
        undefined,
        context.workspaceId,
      );

      return await usersService.getUser(input.user_id);
    } catch (error) {
      await logUpdate(
        "update report params settings",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
        error,
        context.workspaceId,
      );
      throw error;
    }
  });
