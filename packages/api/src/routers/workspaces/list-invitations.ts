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
    return invitationsService.listAllPendingForWorkspace(input.workspaceId);
  });
