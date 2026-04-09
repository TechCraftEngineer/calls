/**
 * LLM модули для транскрибации
 */

export {
  applyLLMCorrection,
  buildCorrectionPrompt,
  correctTranscriptionWithLLM,
  validateAndMergeCorrections,
  type TranscriptionSegment,
} from "./correction";

export {
  applyLLMMerging,
  buildMergingPrompt,
  estimateTokenCount,
  MAX_PROMPT_TOKENS,
  mergeAsrResultsWithLLM,
  type AsrDiarizedResult,
  type AsrNonDiarizedResult,
  type AsrSegment,
} from "./merge";

export {
  isAnsweringMachineWithLlm,
  type AnsweringMachineResult,
} from "./answering-machine";
