import { backup } from "./backup";
import { getIntegrations } from "./get-integrations";
import { getModels } from "./get-models";
import { getPrompts } from "./get-prompts";
import { testMegafonFtp } from "./test-megafon-ftp";
import { updateIntegrations } from "./update-integrations";
import { updateMegafonFtp } from "./update-megafon-ftp";
import { updatePrompts } from "./update-prompts";

export const settingsRouter = {
  getPrompts,
  getIntegrations,
  updatePrompts,
  updateIntegrations,
  updateMegafonFtp,
  getModels,
  backup,
  testMegafonFtp,
};
