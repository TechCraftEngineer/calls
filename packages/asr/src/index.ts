// Types
export type {
  AsrSource,
  Utterance,
  AsrResult,
  AsrProviderMeta,
  AsrExecutionLog,
  TranscriptMetadata,
  PipelineResult,
} from "./types";

export type {
  PreprocessingOptions,
  PreprocessingResult,
} from "./audio/audio-preprocessing";

export type {
  IdentifySpeakersOptions,
  IdentifySpeakersResult,
  IdentifySpeakersMetadata,
} from "./llm/identify-speakers";

export type { SummarizeOptions } from "./llm/summarize";

export type { ValidatedPcm16Wav } from "./audio/validate-pcm16-wav";

// Main pipeline functions (used by jobs)
export { runTranscriptionPipelineFromAsrAudio } from "./pipeline/run-transcription-pipeline";
export { runPipelineAudioPreprocess } from "./pipeline/transcribe-pipeline-audio";

// Audio utilities
export { getAudioDurationFromBuffer } from "./audio/get-audio-duration";
export { preprocessAudio } from "./audio/audio-preprocessing";
export { validatePcm16WavBuffer } from "./audio/validate-pcm16-wav";
export { preprocessAudioWithPython } from "./audio/audio-enhancer-client";

// LLM functions
export { identifySpeakersWithLlm } from "./llm/identify-speakers";
export { mergeAsrWithLlm } from "./llm/merge-asr";
export { normalizeWithLlm } from "./llm/normalize";
export { summarizeWithLlm } from "./llm/summarize";
export { correctWithContext } from "./llm/context-correction";

// ASR providers
export { transcribeWithGigaAm } from "./providers/gigaam";

// Pipeline utilities
export { buildTranscriptMetadata } from "./pipeline/build-metadata";
export { postProcessText } from "./pipeline/post-process";
export { prepareAudioForAsr } from "./pipeline/prepare-audio";
export { runAsrProviders } from "./pipeline/run-asr-providers";

// Utils
export { NonRetryableError, withRetry } from "./utils/retry";
