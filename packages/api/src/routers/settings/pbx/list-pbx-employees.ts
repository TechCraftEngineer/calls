import { pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";

export const listPbxEmployees = workspaceAdminProcedure.handler(async ({ context }) => {
  const [employees, links] = await Promise.all([
    pbxService.listEmployees(context.workspaceId),
    pbxService.listEmployeeLinks(context.workspaceId),
  ]);

  const linkMap = new Map(links.map((l) => [l.targetExternalId, l]));

  return employees.map((employee) => {
    const link = linkMap.get(employee.externalId);
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
