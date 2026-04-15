import { pbxService } from "@calls/db";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";

const linkEmployeeSchema = z
  .object({
    employeeExternalId: z.string(),
    userId: z.string().nullable(),
    invitationId: z.string().nullable(),
  })
  .refine((data) => (data.userId !== null) !== (data.invitationId !== null), {
    message: "Provide exactly one of userId or invitationId",
  });

export const linkEmployee = workspaceAdminProcedure
  .input(linkEmployeeSchema)
  .handler(async ({ input, context }) => {
    await pbxService.linkEmployeeToUser({
      workspaceId: context.workspaceId,
      employeeExternalId: input.employeeExternalId,
      userId: input.userId,
      invitationId: input.invitationId,
      linkedByUserId: context.authUserId,
    });

    return { success: true, message: "Привязка обновлена" };
  });
