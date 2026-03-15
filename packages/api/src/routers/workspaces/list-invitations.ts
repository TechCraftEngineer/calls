import { invitationsService } from "@calls/db";
import { workspaceAdminProcedure } from "../../orpc";
import { workspaceIdInputSchema } from "./schemas";

export const listInvitations = workspaceAdminProcedure
  .input(workspaceIdInputSchema)
  .handler(async ({ input }) => {
    const rows = await invitationsService.listByWorkspace(input.workspaceId);
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      token: r.token,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      invitedBy: r.invitedBy,
    }));
  });
