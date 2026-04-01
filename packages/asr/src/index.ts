// Types

export { preprocessAudioWithPython } from "./audio/audio-enhancer-client";

export type {
  PreprocessingOptions,
  PreprocessingResult,
} from "./audio/audio-preprocessing";
export { preprocessAudio } from "./audio/audio-preprocessing";
// Audio utilities
export { getAudioDurationFromBuffer } from "./audio/get-audio-duration";

export type { ValidatedPcm16Wav } from "./audio/validate-pcm16-wav";
export { validatePcm16WavBuffer } from "./audio/validate-pcm16-wav";
export { correctWithContext } from "./llm/context-correction";
export type {
  IdentifySpeakersMetadata,
  IdentifySpeakersOptions,
  IdentifySpeakersResult,
} from "./llm/identify-speakers";
// LLM functions
export { identifySpeakersWithLlm } from "./llm/identify-speakers";
export type {
  IdentifySpeakersWithEmbeddingsOptions,
  IdentifySpeakersWithEmbeddingsResult,
} from "./llm/identify-speakers-with-embeddings";
export { identifySpeakersWithEmbeddings } from "./llm/identify-speakers-with-embeddings";
export { mergeAsrWithLlm } from "./llm/merge-asr";
export { normalizeWithLlm } from "./llm/normalize";
export type { SummarizeOptions } from "./llm/summarize";
export { summarizeWithLlm } from "./llm/summarize";
// Pipeline utilities
export { buildTranscriptMetadata } from "./pipeline/build-metadata";
export { postProcessText } from "./pipeline/post-process";
export { prepareAudioForAsr } from "./pipeline/prepare-audio";
export { runAsrProviders } from "./pipeline/run-asr-providers";
// Main pipeline functions (used by jobs)
export { runTranscriptionPipelineFromAsrAudio } from "./pipeline/run-transcription-pipeline";
export { runPipelineAudioPreprocess } from "./pipeline/transcribe-pipeline-audio";
// ASR providers
export { transcribeWithGigaAm } from "./providers/gigaam";
export type {
  AsrExecutionLog,
  AsrProviderMeta,
  AsrResult,
  AsrSource,
  PipelineResult,
  TranscriptMetadata,
  Utterance,
} from "./types";

// Utils
export { NonRetryableError, withRetry } from "./utils/retry";
