export {
  detectAnsweringMachine,
  shouldSkipExpensiveProcessing,
} from "./answering-machine-detection";
export type {
  CallEvaluationResult,
  EvaluateCallOptions,
} from "./evaluate-call";
export { evaluateCallWithLlm } from "./evaluate-call";
export { resolveEvaluationPrompt } from "./resolve-prompt";
export type {
  EvaluationTemplate,
  EvaluationTemplateSlug,
} from "./templates";
export {
  EVALUATION_TEMPLATE_SLUGS,
  EVALUATION_TEMPLATES,
  getEvaluationPrompt,
  getEvaluationTemplatesList,
} from "./templates";
