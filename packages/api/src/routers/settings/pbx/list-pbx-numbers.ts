import { pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";

export const listPbxNumbers = workspaceAdminProcedure.handler(async ({ context }) => {
  const [numbers, employees] = await Promise.all([
    pbxService.listNumbers(context.workspaceId),
    pbxService.listEmployees(context.workspaceId),
  ]);

  const employeeMap = new Map(employees.map((employee) => [employee.externalId, employee]));

  // Номера привязаны к сотрудникам через employeeExternalId,
  // привязка к пользователям воркспейса больше не используется
  return numbers.map((number) => {
    const employee = number.employeeExternalId ? employeeMap.get(number.employeeExternalId) : null;

    return {
      ...number,
      employee: employee
        ? {
            externalId: employee.externalId,
            displayName: employee.displayName,
            extension: employee.extension,
          }
        : null,
    };
  });
});
