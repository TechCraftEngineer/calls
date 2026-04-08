import { create } from "./create";
import { deleteUser } from "./delete";
import { get } from "./get";
import { getForEdit } from "./get-for-edit";
import { integrationsRouter } from "./integrations";
import { list } from "./list";
import { userSettingsRouter } from "./settings";
import { update } from "./update";

interface UsersRouter {
  list: typeof list;
  get: typeof get;
  getForEdit: typeof getForEdit;
  create: typeof create;
  delete: typeof deleteUser;
  telegramAuthUrl: typeof integrationsRouter.telegramAuthUrl;
  disconnectTelegram: typeof integrationsRouter.disconnectTelegram;
  maxAuthUrl: typeof integrationsRouter.maxAuthUrl;
  disconnectMax: typeof integrationsRouter.disconnectMax;
  update: typeof update;
  updateBasicInfo: typeof userSettingsRouter.updateBasicInfo;
  updateEmailSettings: typeof userSettingsRouter.updateEmailSettings;
  updateTelegramSettings: typeof userSettingsRouter.updateTelegramSettings;
  updateMaxSettings: typeof userSettingsRouter.updateMaxSettings;
  updateReportParamsSettings: typeof userSettingsRouter.updateReportParamsSettings;
  updateKpiSettings: typeof userSettingsRouter.updateKpiSettings;
  updateFilterSettings: typeof userSettingsRouter.updateFilterSettings;
  updateReportManagedUsersSettings: typeof userSettingsRouter.updateReportManagedUsersSettings;
  updateEvaluationSettings: typeof userSettingsRouter.updateEvaluationSettings;
  [key: string]: any;
}

export const usersRouter: UsersRouter = {
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
  updateReportParamsSettings: userSettingsRouter.updateReportParamsSettings,
  updateKpiSettings: userSettingsRouter.updateKpiSettings,
  updateFilterSettings: userSettingsRouter.updateFilterSettings,
  updateReportManagedUsersSettings: userSettingsRouter.updateReportManagedUsersSettings,
  updateEvaluationSettings: userSettingsRouter.updateEvaluationSettings,
};
