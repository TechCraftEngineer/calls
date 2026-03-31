/**
 * Transcript operations for calls
 */

import { eq } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";

export const callsTranscripts = {
  async getTranscriptByCallId(callId: string): Promise<schema.Transcript | null> {
    const result = await db
      .select()
      .from(schema.transcripts)
      .where(eq(schema.transcripts.callId, callId))
      .limit(1);
    return result[0] ?? null;
  },

  async upsertTranscript(data: {
    callId: string;
    text?: string | null;
    rawText?: string | null;
    title?: string | null;
    sentiment?: string | null;
    confidence?: number | null;
    summary?: string | null;
    callType?: string | null;
    callTopic?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<string> {
    const result = await db
      .insert(schema.transcripts)
      .values({
        callId: data.callId,
        text: data.text ?? null,
        rawText: data.rawText ?? null,
        title: data.title ?? null,
        sentiment: data.sentiment ?? null,
        confidence: data.confidence ?? null,
        summary: data.summary ?? null,
        callType: data.callType ?? null,
        callTopic: data.callTopic ?? null,
        metadata: data.metadata ?? null,
      })
      .onConflictDoUpdate({
        target: schema.transcripts.callId,
        set: {
          text: data.text ?? null,
          rawText: data.rawText ?? null,
          title: data.title ?? null,
          sentiment: data.sentiment ?? null,
          confidence: data.confidence ?? null,
          summary: data.summary ?? null,
          callType: data.callType ?? null,
          callTopic: data.callTopic ?? null,
          metadata: data.metadata ?? null,
        },
      })
      .returning({ id: schema.transcripts.id });
    
    return result[0]?.id ?? "";
  },
};
