import { pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";

export const listPbxEmployees = workspaceAdminProcedure.handler(async ({ context }) => {
  const employees = await pbxService.listEmployees(context.workspaceId);

  // Сотрудники напрямую привязаны к номерам через employeeExternalId,
  // привязка к пользователям воркспейса больше не используется
  return employees.map((employee) => ({
    ...employee,
  }));
});
