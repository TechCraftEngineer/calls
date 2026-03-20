import { create } from "./create";
import { deleteUser } from "./delete";
import { get } from "./get";
import { getForEdit } from "./get-for-edit";
import { integrationsRouter } from "./integrations";
import { list } from "./list";
import { userSettingsRouter } from "./settings";
import { update } from "./update";

export const usersRouter = {
  list,
  get,
  getForEdit,
  create,
  delete: deleteUser,

  telegramAuthUrl: integrationsRouter.telegramAuthUrl,
  disconnectTelegram: integrationsRouter.disconnectTelegram,
  maxAuthUrl: integrationsRouter.maxAuthUrl,
  disconnectMax: integrationsRouter.disconnectMax,

  update,
  updateBasicInfo: userSettingsRouter.updateBasicInfo,
  updateEmailSettings: userSettingsRouter.updateEmailSettings,
  updateTelegramSettings: userSettingsRouter.updateTelegramSettings,
  updateMaxSettings: userSettingsRouter.updateMaxSettings,
  updateReportSettings: userSettingsRouter.updateReportSettings,
  updateReportParamsSettings: userSettingsRouter.updateReportParamsSettings,
  updateKpiSettings: userSettingsRouter.updateKpiSettings,
  updateFilterSettings: userSettingsRouter.updateFilterSettings,
  updateReportManagedUsersSettings:
    userSettingsRouter.updateReportManagedUsersSettings,
  updateEvaluationSettings: userSettingsRouter.updateEvaluationSettings,
};
