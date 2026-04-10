import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../orpc";
import { completeOnboardingSchema } from "./schemas";

export const completeOnboarding = protectedProcedure
  .input(completeOnboardingSchema)
  .handler(async ({ input, context }) => {
    if (!context.authUserId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Требуется авторизация через Better Auth",
      });
    }
    const { workspaceId } = input;
    const member = await context.workspacesService.getMemberWithRole(
      workspaceId,
      context.authUserId,
    );
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new ORPCError("FORBIDDEN", {
        message: "Недостаточно прав для изменения рабочего пространства",
      });
    }
    await context.workspacesService.completeOnboarding(workspaceId, context.authUserId);
    return context.workspacesService.getById(workspaceId);
  });
