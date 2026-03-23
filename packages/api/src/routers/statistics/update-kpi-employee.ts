import { pbxService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

const updateKpiByEmployeeSchema = z.object({
  employeeExternalId: z.string().min(1),
  data: z.object({
    kpiBaseSalary: z.number().int().min(0),
    kpiTargetBonus: z.number().int().min(0),
    kpiTargetTalkTimeMinutes: z.number().int().min(0),
  }),
});

export const updateKpiEmployee = workspaceAdminProcedure
  .input(updateKpiByEmployeeSchema)
  .handler(async ({ input, context }) => {
    const updated = await pbxService.updateEmployeeKpiSettings({
      workspaceId: context.workspaceId,
      externalId: input.employeeExternalId,
      kpiBaseSalary: input.data.kpiBaseSalary,
      kpiTargetBonus: input.data.kpiTargetBonus,
      kpiTargetTalkTimeMinutes: input.data.kpiTargetTalkTimeMinutes,
    });

    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Сотрудник PBX не найден",
      });
    }

    return {
      success: true,
      employeeExternalId: updated.externalId,
    };
  });
