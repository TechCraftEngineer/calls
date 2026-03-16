import { backup } from "./backup";
import { evaluationRouter } from "./evaluation";
import { ftpRouter } from "./ftp";
import { getModels } from "./get-models";
import { integrationsRouter } from "./integrations";
import { promptsRouter } from "./prompts";

export const settingsRouter = {
  getPrompts: promptsRouter.getPrompts,
  updatePrompts: promptsRouter.updatePrompts,
  getIntegrations: integrationsRouter.getIntegrations,
  updateIntegrations: integrationsRouter.updateIntegrations,
  updateFtp: ftpRouter.updateFtp,
  getModels,
  backup,
  testFtp: ftpRouter.testFtp,
  checkFtpStatus: ftpRouter.checkFtpStatus,
  getEvaluationTemplates: evaluationRouter.getEvaluationTemplates,
  getEvaluationTemplate: evaluationRouter.getEvaluationTemplate,
  getEvaluationTemplateBySlug: evaluationRouter.getEvaluationTemplateBySlug,
  getEvaluationSettings: evaluationRouter.getEvaluationSettings,
  updateEvaluationSettings: evaluationRouter.updateEvaluationSettings,
  createEvaluationTemplate: evaluationRouter.createEvaluationTemplate,
  updateEvaluationTemplate: evaluationRouter.updateEvaluationTemplate,
  deleteEvaluationTemplate: evaluationRouter.deleteEvaluationTemplate,
};
