import { changePassword } from "./change-password";
import { create } from "./create";
import { deleteUser } from "./delete";
import { disconnectMax } from "./disconnect-max";
import { disconnectTelegram } from "./disconnect-telegram";
import { get } from "./get";
import { list } from "./list";
import { maxAuthUrl } from "./max-auth-url";
import { telegramAuthUrl } from "./telegram-auth-url";
import { update } from "./update";
import { updateBasicInfo } from "./update-basic-info";
import { updateEmailSettings } from "./update-email-settings";
import { updateFilterSettings } from "./update-filter-settings";
import { updateKpiSettings } from "./update-kpi-settings";
import { updateMaxSettings } from "./update-max-settings";
import { updateReportSettings } from "./update-report-settings";
import { updateTelegramSettings } from "./update-telegram-settings";

export const usersRouter = {
  list,
  get,
  create,
  delete: deleteUser,
  changePassword,

  telegramAuthUrl,
  disconnectTelegram,
  maxAuthUrl,
  disconnectMax,

  update,
  updateBasicInfo,
  updateEmailSettings,
  updateTelegramSettings,
  updateMaxSettings,
  updateReportSettings,
  updateKpiSettings,
  updateFilterSettings,
};
