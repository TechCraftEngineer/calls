/**
 * LLM модули для транскрибации
 */

export {
  type AnsweringMachineResult,
  isAnsweringMachineWithLlm,
} from "./answering-machine";
export {
  applyLLMCorrection,
  buildCorrectionPrompt,
  correctTranscriptionWithLLM,
  type TranscriptionSegment,
  validateAndMergeCorrections,
} from "./correction";
export {
  type AsrDiarizedResult,
  type AsrNonDiarizedResult,
  type AsrSegment,
  applyLLMMerging,
  buildMergingPrompt,
  estimateTokenCount,
  MAX_PROMPT_TOKENS,
  mergeAsrResultsWithLLM,
} from "./merge";
