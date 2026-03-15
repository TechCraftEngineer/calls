import { getEvaluationTemplatesList } from "@calls/jobs";
import { workspaceProcedure } from "../../orpc";

export const getEvaluationTemplates = workspaceProcedure.handler(() => {
  return getEvaluationTemplatesList();
});
