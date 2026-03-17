import { usersService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { canAccessUser, logUpdate } from "../utils";

const updateEvaluationSettingsSchema = z.object({
  evaluationTemplateSlug: z.string().min(1).optional().nullable(),
  evaluationCustomInstructions: z.string().optional().nullable(),
});

export const updateEvaluationSettings = workspaceProcedure
  .input(
    z.object({ user_id: z.string(), data: updateEvaluationSettingsSchema }),
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
          evaluationTemplateSlug: input.data.evaluationTemplateSlug,
          evaluationCustomInstructions: input.data.evaluationCustomInstructions,
        },
      );

      await logUpdate(
        "evaluation settings updated",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
        undefined,
        context.workspaceId,
      );

      return await usersService.getUserForEdit(
        input.user_id,
        context.workspaceId,
      );
    } catch (error) {
      await logUpdate(
        "update user evaluation settings",
        user.email ?? "unknown",
        ((context.user as Record<string, unknown>).email as string) ??
          "unknown",
        error,
        context.workspaceId,
      );
      throw error;
    }
  });
