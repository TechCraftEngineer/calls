import { invitationsService } from "@calls/db";
import { workspaceAdminProcedure } from "../../orpc";
import { workspaceIdInputSchema } from "./schemas";

export const listInvitations = workspaceAdminProcedure
  .input(workspaceIdInputSchema)
  .handler(async ({ input }) => {
    const rows = await invitationsService.listPendingByWorkspace(
      input.workspaceId,
    );
    return rows.map((r) => ({
      id: r.id,
      email: r.user.email,
      role: r.role,
      token: r.invitationToken,
      expiresAt: r.invitationExpiresAt,
      createdAt: r.createdAt,
      invitedBy: r.invitedBy,
    }));
  });
