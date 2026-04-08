import { pbxRepository, pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";

export const listPbxEmployees = workspaceAdminProcedure.handler(async ({ context }) => {
  const [employees, links, allWorkspaceUsers, allWorkspaceInvitations] = await Promise.all([
    pbxService.listEmployees(context.workspaceId),
    pbxService.listLinks(context.workspaceId),
    pbxRepository.findAllWorkspaceUsers(context.workspaceId),
    pbxRepository.findAllWorkspaceInvitations(context.workspaceId),
  ]);

  const linkMap = new Map(
    links
      .filter((item) => item.link.targetType === "employee")
      .map((item) => [item.link.targetExternalId, item]),
  );

  return employees.map((employee) => {
    const existingLink = linkMap.get(employee.externalId);

    // Фильтруем пользователей, которые уже привязаны к другим сотрудникам
    const linkedUserIds = new Set(
      links.filter((l) => l.link.userId).map((l) => l.link.userId),
    );
    const linkedInvitationIds = new Set(
      links.filter((l) => l.link.invitationId).map((l) => l.link.invitationId),
    );

    // Исключаем текущую привязку из фильтра
    if (existingLink?.link.userId) {
      linkedUserIds.delete(existingLink.link.userId);
    }
    if (existingLink?.link.invitationId) {
      linkedInvitationIds.delete(existingLink.link.invitationId);
    }

    const availableUsers = allWorkspaceUsers.filter((user) => !linkedUserIds.has(user.id));
    const availableInvitations = allWorkspaceInvitations.filter(
      (inv) => !linkedInvitationIds.has(inv.id),
    );

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
      candidates: availableUsers,
      invitationCandidates: availableInvitations.map((item) => ({
        id: item.id,
        email: item.email,
        role: item.role,
      })),
    };
  });
});
