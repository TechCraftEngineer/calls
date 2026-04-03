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

export const transcribeRequested = eventType("asr/transcribe.requested", {
  schema: staticSchema<TranscribeRequestedData>(),
});

export const evaluateRequested = eventType("call/evaluate.requested", {
  schema: staticSchema<EvaluateRequestedData>(),
});

export const pbxSyncRequested = eventType("pbx/sync.requested", {
  schema: staticSchema<PbxSyncRequestedData>(),
});
