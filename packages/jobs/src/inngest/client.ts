import { eventType, Inngest, staticSchema } from "inngest";

export const inngest = new Inngest({
  id: "calls-sync-and-transcribe",
  name: "QBS Звонки",
  checkpointing: {
    maxRuntime: "50s",
  },
});

type TranscribeRequestedData = { callId: string };
type EvaluateRequestedData = { callId: string };
type PbxSyncRequestedData = {
  workspaceId: string;
  syncType: "directory" | "calls";
  syncRecordings?: boolean;
  webhookEvent?: {
    eventId?: string | null;
    eventType: string;
    payload: Record<string, unknown>;
  };
};
type ProcessImportedCallsData = {
  workspaceId: string;
  importedCount: number;
};
type GigaAmTranscriptionCompletedData = {
  task_id: string;
  status: "completed" | "failed";
  result?: Record<string, unknown>;
  error?: string;
};

type SpeakerEmbeddingsDiarizationCompletedData = {
  task_id: string;
  status: "completed" | "failed";
  result?: Record<string, unknown>;
  error?: string;
};

export const transcribeRequested = eventType("asr/transcribe.requested", {
  schema: staticSchema<TranscribeRequestedData>(),
});

export const evaluateRequested = eventType("call/evaluate.requested", {
  schema: staticSchema<EvaluateRequestedData>(),
});

export const pbxSyncRequested = eventType("pbx/sync.requested", {
  schema: staticSchema<PbxSyncRequestedData>(),
});

export const processImportedCalls = eventType("calls/process-imported", {
  schema: staticSchema<ProcessImportedCallsData>(),
});

export const gigaAmTranscriptionCompleted = eventType("giga-am/transcription.completed", {
  schema: staticSchema<GigaAmTranscriptionCompletedData>(),
});

export const speakerEmbeddingsDiarizationCompleted = eventType(
  "speaker-embeddings/diarization.completed",
  {
    schema: staticSchema<SpeakerEmbeddingsDiarizationCompletedData>(),
  },
);
