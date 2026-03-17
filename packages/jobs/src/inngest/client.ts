import { eventType, Inngest, staticSchema } from "inngest";

export const inngest = new Inngest({
  id: "calls-megafon-sync",
  name: "QBS Звонки",
  checkpointing: {
    maxRuntime: "50s",
  },
});

type TranscribeRequestedData = { callId: string };
type EvaluateRequestedData = { callId: string };

export const transcribeRequested = eventType("call/transcribe.requested", {
  schema: staticSchema<TranscribeRequestedData>(),
});

export const evaluateRequested = eventType("call/evaluate.requested", {
  schema: staticSchema<EvaluateRequestedData>(),
});
