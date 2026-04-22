import { pbxService } from "@calls/db";
import { workspaceAdminProcedure } from "../../../orpc";
import { pbxEmployeeReportSettingsSchema } from "./schemas";

export const updateEmployeeReportSettings = workspaceAdminProcedure
  .input(pbxEmployeeReportSettingsSchema)
  .handler(async ({ input, context }) => {
    const { employeeId, email, dailyReport, weeklyReport, monthlyReport, skipWeekends } = input;

    // Update report settings using service
    await pbxService.updateEmployeeReportSettings({
      employeeId,
      workspaceId: context.workspaceId,
      email: email?.trim() || null,
      dailyReport,
      weeklyReport,
      monthlyReport,
      skipWeekends,
    });

    return {
      success: true,
      message: "Настройки отчётов сохранены",
    };
  });
