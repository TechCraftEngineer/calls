import { pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";
import { pbxLinkSchema } from "./schemas";

export const linkPbxUser = workspaceAdminProcedure
  .input(pbxLinkSchema)
  .handler(async ({ input, context }) => {
    const linkedByUserId =
      typeof (context.user as Record<string, unknown>)?.id === "string"
        ? String((context.user as Record<string, unknown>).id)
        : null;

    const link = await pbxService.linkTarget({
      workspaceId: context.workspaceId,
      targetType: input.targetType,
      targetExternalId: input.targetExternalId,
      userId: input.userId ?? null,
      invitationId: input.invitationId ?? null,
      linkedByUserId,
      linkSource: "manual",
      confidence: 100,
    });

    return { success: true, link };
  });
