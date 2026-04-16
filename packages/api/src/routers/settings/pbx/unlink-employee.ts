import { pbxService } from "@calls/db";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";

const unlinkEmployeeSchema = z.object({
  employeeExternalId: z.string().trim().min(1, "Внешний ID сотрудника не может быть пустым"),
});

export const unlinkEmployee = workspaceAdminProcedure
  .input(unlinkEmployeeSchema)
  .handler(async ({ input, context }) => {
    await pbxService.unlinkEmployee(context.workspaceId, input.employeeExternalId);

    return { success: true, message: "Привязка удалена" };
  });
