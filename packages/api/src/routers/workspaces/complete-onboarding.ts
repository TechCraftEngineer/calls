import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";
import { completeOnboardingSchema } from "./schemas";

export const completeOnboarding = protectedProcedure
  .input(completeOnboardingSchema)
  .handler(async ({ input, context }) => {
    const { workspaceId } = input;
    const userId = context.authUserId;
    if (!userId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Пользователь не авторизован",
      });
    }
    const member = await context.workspacesService.getMemberWithRole(
      workspaceId,
      userId,
    );
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new ORPCError("FORBIDDEN", {
        message: "Недостаточно прав для изменения рабочего пространства",
      });
    }
    await context.workspacesService.completeOnboarding(workspaceId, userId);
    return context.workspacesService.getById(workspaceId);
  });
