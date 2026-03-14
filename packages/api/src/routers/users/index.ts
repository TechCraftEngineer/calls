import * as basic from "./procedures/basic";
import * as connections from "./procedures/connections";
import * as updates from "./procedures/updates";

export const usersRouter = {
  list: basic.list,
  get: basic.get,
  create: basic.create,
  delete: basic.deleteUser,
  changePassword: basic.changePassword,

  telegramAuthUrl: connections.telegramAuthUrl,
  disconnectTelegram: connections.disconnectTelegram,
  maxAuthUrl: connections.maxAuthUrl,
  disconnectMax: connections.disconnectMax,

  update: updates.update,
  updateBasicInfo: updates.updateBasicInfo,
  updateEmailSettings: updates.updateEmailSettings,
  updateTelegramSettings: updates.updateTelegramSettings,
  updateMaxSettings: updates.updateMaxSettings,
  updateReportSettings: updates.updateReportSettings,
  updateKpiSettings: updates.updateKpiSettings,
  updateFilterSettings: updates.updateFilterSettings,
};
