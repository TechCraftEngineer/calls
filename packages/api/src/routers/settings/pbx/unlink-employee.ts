import { pbxService } from "@calls/db";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";

const unlinkEmployeeSchema = z.object({
  employeeExternalId: z.string().trim().min(1, "Employee external ID cannot be empty"),
});

export const unlinkEmployee = workspaceAdminProcedure
  .input(unlinkEmployeeSchema)
  .handler(async ({ input, context }) => {
    await pbxService.unlinkEmployee(context.workspaceId, input.employeeExternalId);

    return { success: true, message: "Привязка удалена" };
  });
