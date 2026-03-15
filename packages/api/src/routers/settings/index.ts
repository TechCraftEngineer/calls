import { backup } from "./backup";
import { checkFtpStatus } from "./check-ftp-status";
import { createEvaluationTemplate } from "./create-evaluation-template";
import { deleteEvaluationTemplate } from "./delete-evaluation-template";
import { getEvaluationSettings } from "./get-evaluation-settings";
import { getEvaluationTemplate } from "./get-evaluation-template";
import { getEvaluationTemplateBySlug } from "./get-evaluation-template-by-slug";
import { getEvaluationTemplates } from "./get-evaluation-templates";
import { getIntegrations } from "./get-integrations";
import { getModels } from "./get-models";
import { getPrompts } from "./get-prompts";
import { testFtp } from "./test-ftp";
import { updateEvaluationSettings } from "./update-evaluation-settings";
import { updateEvaluationTemplate } from "./update-evaluation-template";
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
  getEvaluationTemplates,
  getEvaluationTemplate,
  getEvaluationTemplateBySlug,
  getEvaluationSettings,
  updateEvaluationSettings,
  createEvaluationTemplate,
  updateEvaluationTemplate,
  deleteEvaluationTemplate,
};
