import { updateBasicInfo } from "./update-basic-info";
import { updateEmailSettings } from "./update-email-settings";
import { updateEvaluationSettings } from "./update-evaluation-settings";
import { updateFilterSettings } from "./update-filter-settings";
import { updateKpiSettings } from "./update-kpi-settings";
import { updateMaxSettings } from "./update-max-settings";
import { updateReportSettings } from "./update-report-settings";
import { updateTelegramSettings } from "./update-telegram-settings";

export const userSettingsRouter = {
  updateBasicInfo,
  updateEmailSettings,
  updateTelegramSettings,
  updateMaxSettings,
  updateReportSettings,
  updateKpiSettings,
  updateFilterSettings,
  updateEvaluationSettings,
};
