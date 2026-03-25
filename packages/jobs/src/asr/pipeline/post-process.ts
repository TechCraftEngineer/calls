import { correctWithContext } from "../llm/context-correction";
import { normalizeWithLlm } from "../llm/normalize";
import { summarizeWithLlm } from "../llm/summarize";

export async function postProcessText(input: {
  rawText: string;
  startTs: number;
  options?: {
    skipNormalization?: boolean;
    skipContextCorrection?: boolean;
    summaryPrompt?: string;
    companyContext?: string | null;
  };
}): Promise<{
  contextCorrectedText: string;
  contextCorrectionApplied: boolean;
  processingTimeMs: number;
  normalizedText: string;
  summary?: string;
  sentiment?: string;
  title?: string;
  callType?: string;
  callTopic?: string;
}> {
  const { rawText, startTs, options } = input;

  // Контекстная коррекция: исправляем ошибки ASR с учетом контекста разговора
  let contextCorrectedText = rawText;
  let contextCorrectionApplied = false;
  if (!options?.skipContextCorrection && rawText.trim().length > 0) {
    contextCorrectionApplied = true;
    contextCorrectedText = await correctWithContext(rawText, {
      companyContext: options?.companyContext,
    });
  }

  // LLM нормализация
  let normalizedText = contextCorrectedText;
  if (!options?.skipNormalization && contextCorrectedText.trim().length > 0) {
    normalizedText = await normalizeWithLlm(contextCorrectedText);
  }

  const defaultTopic = "Не определена";
  let summary: string | undefined;
  let sentiment: string | undefined;
  let title: string | undefined;
  let callType: string | undefined = "Другое";
  let callTopic: string | undefined = defaultTopic;

  if (normalizedText.trim().length > 0) {
    const analysis = await summarizeWithLlm(normalizedText, {
      summaryPrompt: options?.summaryPrompt,
      companyContext: options?.companyContext,
    });
    summary = analysis.summary;
    sentiment = analysis.sentiment;
    title = analysis.title;
    callType = analysis.callType ?? "Другое";
    callTopic = analysis.callTopic ?? defaultTopic;
  }

  const processingTimeMs = Date.now() - startTs;

  return {
    contextCorrectedText,
    contextCorrectionApplied,
    processingTimeMs,
    normalizedText,
    summary,
    sentiment,
    title,
    callType,
    callTopic,
  };
}
