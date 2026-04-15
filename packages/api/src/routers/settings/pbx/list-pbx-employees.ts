import { pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";

export const listPbxEmployees = workspaceAdminProcedure.handler(async ({ context }) => {
  const employees = await pbxService.listEmployees(context.workspaceId);
  const links = await pbxService.listEmployeeLinks(context.workspaceId);

  return employees.map((employee) => {
    const link = links.find((l) => l.targetExternalId === employee.externalId);
    return {
      ...employee,
      linkedUser: link?.user
        ? {
            id: link.user.id,
            email: link.user.email,
            name: link.user.name || link.user.email,
          }
        : null,
      linkedInvitation: link?.invitation
        ? {
            id: link.invitation.id,
            email: link.invitation.email,
            role: link.invitation.role,
          }
        : null,
    };
  });
});
