import { invitationsService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";
import { workspaceIdInputSchema } from "../schemas";

type ListInvitationItem = {
  id: string;
  email: string | null;
  role: string;
  token: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  invitedBy: string | null;
  pendingSettings?: Record<string, unknown>;
  invitationType?: "email" | "link";
};

export const listInvitations = workspaceAdminProcedure
  .input(workspaceIdInputSchema)
  .handler(async ({ input }): Promise<ListInvitationItem[]> => {
    return invitationsService.listAllPendingForWorkspace(input.workspaceId);
  });
