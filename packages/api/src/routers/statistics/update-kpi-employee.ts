import { pbxService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../orpc";

const updateKpiByEmployeeSchema = z.object({
  employeeExternalId: z.string().min(1),
  data: z.object({
    kpiBaseSalary: z
      .number({ message: "Базовый оклад должен быть числом" })
      .int({ message: "Базовый оклад должен быть целым числом" })
      .min(0, { message: "Базовый оклад не может быть отрицательным" })
      .max(1_000_000, {
        message: "Базовый оклад не может превышать 1 000 000",
      }),
    kpiTargetBonus: z
      .number({ message: "Целевой бонус должен быть числом" })
      .int({ message: "Целевой бонус должен быть целым числом" })
      .min(0, { message: "Целевой бонус не может быть отрицательным" })
      .max(1_000_000, {
        message: "Целевой бонус не может превышать 1 000 000",
      }),
    kpiTargetTalkTimeMinutes: z
      .number({ message: "Целевое время разговоров должно быть числом" })
      .int({
        message: "Целевое время разговоров должно быть целым числом",
      })
      .min(0, {
        message: "Целевое время разговоров не может быть отрицательным",
      })
      .max(100_000, {
        message: "Целевое время разговоров не может превышать 100 000 минут",
      }),
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
