import { z } from "zod";
import { pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";

const unlinkEmployeeSchema = z.object({
  employeeExternalId: z.string(),
});

export const unlinkEmployee = workspaceAdminProcedure
  .input(unlinkEmployeeSchema)
  .handler(async ({ input, context }) => {
    await pbxService.unlinkEmployee(context.workspaceId, input.employeeExternalId);

    return { success: true, message: "Привязка удалена" };
  });
