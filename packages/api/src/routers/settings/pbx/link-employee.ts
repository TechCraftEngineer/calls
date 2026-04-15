import { pbxService } from "@calls/db";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";

const linkEmployeeSchema = z
  .object({
    employeeExternalId: z.string().trim().min(1, "Внешний ID сотрудника не может быть пустым"),
    userId: z.string().nullable(),
    invitationId: z.string().nullable(),
  })
  .refine((data) => (data.userId !== null) !== (data.invitationId !== null), {
    message: "Укажите ровно одно из userId или invitationId",
  });

export const linkEmployee = workspaceAdminProcedure
  .input(linkEmployeeSchema)
  .handler(async ({ input, context }) => {
    await pbxService.linkEmployeeToUser({
      workspaceId: context.workspaceId,
      employeeExternalId: input.employeeExternalId,
      userId: input.userId,
      invitationId: input.invitationId,
      linkedByUserId: context.authUserId ?? undefined,
    });

    return { success: true, message: "Привязка обновлена" };
  });
