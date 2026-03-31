import { pbxRepository, pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";

export const listPbxEmployees = workspaceAdminProcedure.handler(async ({ context }) => {
  const [employees, links] = await Promise.all([
    pbxService.listEmployees(context.workspaceId),
    pbxService.listLinks(context.workspaceId),
  ]);

  const linkMap = new Map(
    links
      .filter((item) => item.link.targetType === "employee")
      .map((item) => [item.link.targetExternalId, item]),
  );

  return Promise.all(
    employees.map(async (employee) => {
      const candidates = await pbxRepository.findCandidateUsers(
        context.workspaceId,
        employee.extension ? [employee.extension] : [],
        employee.email ? [employee.email] : [],
      );
      const invitationCandidates = employee.email
        ? await pbxRepository.findCandidateInvitations(context.workspaceId, [employee.email])
        : [];
      const existingLink = linkMap.get(employee.externalId);

      return {
        ...employee,
        linkedUser: existingLink?.user
          ? {
              id: existingLink.user.id,
              email: existingLink.user.email,
              name: existingLink.user.name,
            }
          : null,
        linkedInvitation: existingLink?.invitation
          ? {
              id: existingLink.invitation.id,
              email: existingLink.invitation.email,
              role: existingLink.invitation.role,
            }
          : null,
        link: existingLink?.link ?? null,
        candidates,
        invitationCandidates: invitationCandidates.map((item) => ({
          id: item.id,
          email: item.email,
          role: item.role,
        })),
      };
    }),
  );
});
