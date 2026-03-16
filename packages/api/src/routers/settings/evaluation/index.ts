import { createEvaluationTemplate } from "./create-evaluation-template";
import { deleteEvaluationTemplate } from "./delete-evaluation-template";
import { getEvaluationSettings } from "./get-evaluation-settings";
import { getEvaluationTemplate } from "./get-evaluation-template";
import { getEvaluationTemplateBySlug } from "./get-evaluation-template-by-slug";
import { getEvaluationTemplates } from "./get-evaluation-templates";
import { updateEvaluationSettings } from "./update-evaluation-settings";
import { updateEvaluationTemplate } from "./update-evaluation-template";

export const evaluationRouter = {
  getEvaluationTemplates,
  getEvaluationTemplate,
  getEvaluationTemplateBySlug,
  getEvaluationSettings,
  updateEvaluationSettings,
  createEvaluationTemplate,
  updateEvaluationTemplate,
  deleteEvaluationTemplate,
};
