import { pbxRepository, pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";

export const listPbxNumbers = workspaceAdminProcedure.handler(
  async ({ context }) => {
    const [numbers, employees, links] = await Promise.all([
      pbxService.listNumbers(context.workspaceId),
      pbxService.listEmployees(context.workspaceId),
      pbxService.listLinks(context.workspaceId),
    ]);

    const employeeMap = new Map(
      employees.map((employee) => [employee.externalId, employee]),
    );
    const linkMap = new Map(
      links
        .filter((item) => item.link.targetType === "number")
        .map((item) => [item.link.targetExternalId, item]),
    );

    return Promise.all(
      numbers.map(async (number) => {
        const candidates = await pbxRepository.findCandidateUsers(
          context.workspaceId,
          [number.extension, number.phoneNumber].filter(
            (item): item is string => Boolean(item),
          ),
          [],
        );
        const existingLink = linkMap.get(number.externalId);
        const employee = number.employeeExternalId
          ? employeeMap.get(number.employeeExternalId)
          : null;

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
          candidates,
        };
      }),
    );
  },
);
