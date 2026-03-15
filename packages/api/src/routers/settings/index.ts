import { backup } from "./backup";
import { checkFtpStatus } from "./check-ftp-status";
import { getIntegrations } from "./get-integrations";
import { getModels } from "./get-models";
import { getPrompts } from "./get-prompts";
import { testFtp } from "./test-ftp";
import { updateFtp } from "./update-ftp";
import { updateIntegrations } from "./update-integrations";
import { updatePrompts } from "./update-prompts";

export const settingsRouter = {
  getPrompts,
  getIntegrations,
  updatePrompts,
  updateIntegrations,
  updateFtp,
  getModels,
  backup,
  testFtp,
  checkFtpStatus,
};
