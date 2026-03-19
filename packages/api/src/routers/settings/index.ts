import { backup } from "./backup";
import { evaluationRouter } from "./evaluation";
import { ftpRouter } from "./ftp";
import { getModels } from "./get-models";
import { integrationsRouter } from "./integrations";
import { pbxRouter } from "./pbx";
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
  getPbx: pbxRouter.getPbx,
  updatePbx: pbxRouter.updatePbx,
  updatePbxAccess: pbxRouter.updatePbxAccess,
  updatePbxExcludedNumbers: pbxRouter.updatePbxExcludedNumbers,
  updatePbxSyncOptions: pbxRouter.updatePbxSyncOptions,
  updatePbxWebhook: pbxRouter.updatePbxWebhook,
  testPbx: pbxRouter.testPbx,
  syncPbxDirectory: pbxRouter.syncPbxDirectory,
  syncPbxCalls: pbxRouter.syncPbxCalls,
  syncPbxRecordings: pbxRouter.syncPbxRecordings,
  listPbxEmployees: pbxRouter.listPbxEmployees,
  listPbxNumbers: pbxRouter.listPbxNumbers,
  linkPbxUser: pbxRouter.linkPbxUser,
  unlinkPbxUser: pbxRouter.unlinkPbxUser,
  getEvaluationTemplates: evaluationRouter.getEvaluationTemplates,
  getEvaluationTemplate: evaluationRouter.getEvaluationTemplate,
  getEvaluationTemplateBySlug: evaluationRouter.getEvaluationTemplateBySlug,
  getEvaluationSettings: evaluationRouter.getEvaluationSettings,
  updateEvaluationSettings: evaluationRouter.updateEvaluationSettings,
  createEvaluationTemplate: evaluationRouter.createEvaluationTemplate,
  updateEvaluationTemplate: evaluationRouter.updateEvaluationTemplate,
  deleteEvaluationTemplate: evaluationRouter.deleteEvaluationTemplate,
};
