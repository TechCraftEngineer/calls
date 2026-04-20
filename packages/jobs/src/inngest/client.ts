import { eventType, Inngest, staticSchema } from "inngest";

// Branded тип для CallId - непустая строка с брендом для типобезопасности
declare const __brand: unique symbol;
export type CallId = string & { readonly [__brand]: "CallId" };

// Helper для создания CallId из непустой строки
export function makeCallId(value: string): CallId {
  if (!value || value.trim().length === 0) {
    throw new Error("CallId не может быть пустой строкой");
  }
  return value as CallId;
}

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
  call_id: CallId;
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
