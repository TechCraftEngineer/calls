import { pbxService } from "@calls/db";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";

const getEmployeeReportSettingsSchema = z.object({
  employeeId: z.string().uuid("Некорректный ID сотрудника"),
});

export const getEmployeeReportSettings = workspaceAdminProcedure
  .input(getEmployeeReportSettingsSchema)
  .handler(async ({ input }) => {
    const setting = await pbxService.getEmployeeReportSettings(input.employeeId);

    if (!setting) {
      // Return default empty settings
      return {
        employeeId: input.employeeId,
        email: null as string | null,
        dailyReport: false,
        weeklyReport: false,
        monthlyReport: false,
        skipWeekends: false,
      };
    }

    return {
      employeeId: setting.employeeId,
      email: setting.email,
      dailyReport: setting.dailyReport,
      weeklyReport: setting.weeklyReport,
      monthlyReport: setting.monthlyReport,
      skipWeekends: setting.skipWeekends,
    };
  });
