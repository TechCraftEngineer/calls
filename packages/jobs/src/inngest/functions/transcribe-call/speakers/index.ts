/**
 * Модуль работы со спикерами
 */

export {
  checkSpeakerEmbeddingsHealth,
  getDiarizationStatus,
  type PerformDiarizationResult,
  performDiarization,
  type SpeakerDiarizationResult,
  shouldUseSpeakerEmbeddings,
  startSpeakerDiarization,
} from "./diarization";

export {
  createSpeakerEmbeddingsCompletedEvent,
  handleSpeakerEmbeddingsCallback,
  type SpeakerEmbeddingsCallbackData,
  speakerEmbeddingsCompletedFn,
  validateSpeakerEmbeddingsCallback,
} from "./embeddings-handler";

export {
  type IdentifySpeakersResult,
  identifySpeakers,
} from "./identification";
