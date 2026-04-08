import { pbxRepository, pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";

export const listPbxNumbers = workspaceAdminProcedure.handler(async ({ context }) => {
  const [numbers, employees, links, allWorkspaceUsers] = await Promise.all([
    pbxService.listNumbers(context.workspaceId),
    pbxService.listEmployees(context.workspaceId),
    pbxService.listLinks(context.workspaceId),
    pbxRepository.findAllWorkspaceUsers(context.workspaceId),
  ]);

  const employeeMap = new Map(employees.map((employee) => [employee.externalId, employee]));
  const linkMap = new Map(
    links
      .filter((item) => item.link.targetType === "number")
      .map((item) => [item.link.targetExternalId, item]),
  );

  // Фильтруем пользователей, которые уже привязаны к номерам
  const linkedUserIds = new Set(
    links.filter((l) => l.link.userId && l.link.targetType === "number").map((l) => l.link.userId),
  );

  return numbers.map((number) => {
    const existingLink = linkMap.get(number.externalId);
    const employee = number.employeeExternalId
      ? employeeMap.get(number.employeeExternalId)
      : null;

    // Исключаем текущую привязку из фильтра
    if (existingLink?.link.userId) {
      linkedUserIds.delete(existingLink.link.userId);
    }

    const availableUsers = allWorkspaceUsers.filter((user) => !linkedUserIds.has(user.id));

    return {
      ...number,
      employee: employee
        ? {
            externalId: employee.externalId,
            displayName: employee.displayName,
            extension: employee.extension,
          }
        : null,
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
    };
  });
});
