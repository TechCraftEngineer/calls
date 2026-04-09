/**
 * Модуль работы со спикерами
 */

export {
  checkSpeakerEmbeddingsHealth,
  getDiarizationStatus,
  performDiarization,
  shouldUseSpeakerEmbeddings,
  startSpeakerDiarization,
  type PerformDiarizationResult,
  type SpeakerDiarizationResult,
} from "./diarization";

export {
  createSpeakerEmbeddingsCompletedEvent,
  handleSpeakerEmbeddingsCallback,
  speakerEmbeddingsCompletedFn,
  validateSpeakerEmbeddingsCallback,
  type SpeakerEmbeddingsCallbackData,
} from "./embeddings-handler";

export {
  identifySpeakers,
  type IdentifySpeakersResult,
} from "./identification";
