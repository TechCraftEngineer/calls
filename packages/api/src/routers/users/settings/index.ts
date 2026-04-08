import { updateBasicInfo } from "./update-basic-info";
import { updateEmailSettings } from "./update-email-settings";
import { updateEvaluationSettings } from "./update-evaluation-settings";
import { updateFilterSettings } from "./update-filter-settings";
import { updateKpiSettings } from "./update-kpi-settings";
import { updateMaxSettings } from "./update-max-settings";
import { updateReportManagedUsersSettings } from "./update-report-managed-users-settings";
import { updateReportParamsSettings } from "./update-report-params-settings";
import { updateTelegramSettings } from "./update-telegram-settings";

interface UserSettingsRouter {
  updateBasicInfo: typeof updateBasicInfo;
  updateEmailSettings: typeof updateEmailSettings;
  updateTelegramSettings: typeof updateTelegramSettings;
  updateMaxSettings: typeof updateMaxSettings;
  updateReportParamsSettings: typeof updateReportParamsSettings;
  updateKpiSettings: typeof updateKpiSettings;
  updateFilterSettings: typeof updateFilterSettings;
  updateReportManagedUsersSettings: typeof updateReportManagedUsersSettings;
  updateEvaluationSettings: typeof updateEvaluationSettings;
}

export const userSettingsRouter: UserSettingsRouter = {
  updateBasicInfo,
  updateEmailSettings,
  updateTelegramSettings,
  updateMaxSettings,
  updateReportParamsSettings,
  updateKpiSettings,
  updateFilterSettings,
  updateReportManagedUsersSettings,
  updateEvaluationSettings,
};
