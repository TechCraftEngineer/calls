import { invitationsService } from "@calls/db";
import { workspaceAdminProcedure } from "../../orpc";
import { workspaceIdInputSchema } from "./schemas";

type ListInvitationItem = {
  id: string;
  email: string;
  role: string;
  token: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  invitedBy: string | null;
  pendingSettings?: Record<string, unknown>;
};

export const listInvitations = workspaceAdminProcedure
  .input(workspaceIdInputSchema)
  .handler(async ({ input }): Promise<ListInvitationItem[]> => {
    const rows = await invitationsService.listPendingByWorkspaceWithSettings(
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
      pendingSettings: r.pendingSettings as Record<string, unknown> | undefined,
    }));
  });
