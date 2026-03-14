import { backup } from "./backup";
import { getModels } from "./get-models";
import { getPrompts } from "./get-prompts";
import { testMegafonFtp } from "./test-megafon-ftp";
import { updatePrompts } from "./update-prompts";

export const settingsRouter = {
  getPrompts,
  updatePrompts,
  getModels,
  backup,
  testMegafonFtp,
};
