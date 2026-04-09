/**
 * Генерация summary через LLM
 */

import { summarizeWithLlm } from "@calls/asr/llm/summarize";
import { buildCompanyContext } from "@calls/shared";
import { createLogger } from "~/logger";
import type { Workspace } from "~/inngest/functions/transcribe-call/schemas";

const logger = createLogger("transcribe-call:summarize");

export interface SummarizeResult {
  summary: string | null;
  sentiment: string | null;
  title: string | null;
  callType: string | null;
  callTopic: string | null;
  summarizeTimeMs: number;
}

export async function summarize(
  normalizedText: string,
  workspace: Workspace,
  managerNameFromPbx: string | null,
  callId: string,
): Promise<SummarizeResult> {
  const summarizeStartTime = Date.now();
  const companyContext = buildCompanyContext(workspace);

  const result = await summarizeWithLlm(normalizedText, {
    maxChars: 20_000,
    companyContext,
    managerName: managerNameFromPbx,
  });

  const summarizeTimeMs = Date.now() - summarizeStartTime;

  logger.info("LLM summarization completed", {
    callId,
    summarizeTimeMs,
    hasSummary: !!result.summary,
    sentiment: result.sentiment,
    title: result.title,
  });

  return {
    summary: result.summary ?? null,
    sentiment: result.sentiment ?? null,
    title: result.title ?? null,
    callType: result.callType ?? null,
    callTopic: result.callTopic ?? null,
    summarizeTimeMs,
  };
}
