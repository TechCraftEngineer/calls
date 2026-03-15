/**
 * Конвейер обработки аудио: ASR (параллельно) → выбор/объединение → LLM нормализация
 */

import { createLogger } from "../logger";
import { transcribeWithAssemblyAi } from "./assemblyai";
import { normalizeWithLlm } from "./normalize";
import { summarizeWithLlm } from "./summarize";
import type {
  AsrResult,
  AsrSource,
  PipelineResult,
  TranscriptMetadata,
} from "./types";
import { transcribeWithYandex } from "./yandex";

const logger = createLogger("asr-pipeline");

/** Оценка качества: длина + confidence, предпочтение AssemblyAI (диаризация) */
function scoreResult(r: AsrResult): number {
  let score = r.text.length * 0.1;
  if (r.confidence != null) score += r.confidence * 100;
  if (r.utterances?.length) score += Math.min(r.utterances.length * 5, 30);
  if (r.source === "assemblyai") score += 20; // предпочитаем диаризацию
  return score;
}

/** Выбор лучшего результата или объединение при близких оценках */
function selectBest(results: AsrResult[]): {
  text: string;
  source: AsrSource;
  raw: AsrResult[];
} {
  const valid = results.filter((r) => r.text?.trim().length > 0);
  if (valid.length === 0) {
    return { text: "", source: "merged", raw: results };
  }
  if (valid.length === 1) {
    const sole = valid[0];
    if (!sole) return { text: "", source: "merged", raw: results };
    return {
      text: sole.text,
      source: sole.source,
      raw: results,
    };
  }

  valid.sort((a, b) => scoreResult(b) - scoreResult(a));
  const best = valid[0];
  const second = valid[1];
  if (!best || !second) return { text: "", source: "merged", raw: results };
  const diff = scoreResult(best) - scoreResult(second);

  // Если разница маленькая — объединяем
  if (diff < 15 && second.text.length > best.text.length * 0.7) {
    const merged =
      best.utterances?.length && !second.utterances?.length
        ? best.text
        : best.text.length >= second.text.length
          ? best.text
          : second.text;
    return {
      text: merged,
      source: "merged",
      raw: results,
    };
  }

  return {
    text: best.text,
    source: best.source,
    raw: results,
  };
}

export async function runTranscriptionPipeline(
  audioUrl: string,
  options?: {
    skipNormalization?: boolean;
    summaryPrompt?: string;
  },
): Promise<PipelineResult> {
  const start = Date.now();
  logger.info("Запуск конвейера распознавания", {
    audioUrl: audioUrl.slice(0, 80),
  });

  // Параллельное распознавание с обработкой ошибок
  const [assemblyaiResult, yandexResult] = await Promise.allSettled([
    transcribeWithAssemblyAi(audioUrl),
    transcribeWithYandex(audioUrl),
  ]);

  const results: AsrResult[] = [];

  if (assemblyaiResult.status === "fulfilled" && assemblyaiResult.value) {
    results.push(assemblyaiResult.value);
  } else if (assemblyaiResult.status === "rejected") {
    logger.warn("AssemblyAI распознавание не удалось", {
      error:
        assemblyaiResult.reason instanceof Error
          ? assemblyaiResult.reason.message
          : String(assemblyaiResult.reason),
    });
  }

  if (yandexResult.status === "fulfilled" && yandexResult.value) {
    results.push(yandexResult.value);
  } else if (yandexResult.status === "rejected") {
    logger.warn("Yandex распознавание не удалось", {
      error:
        yandexResult.reason instanceof Error
          ? yandexResult.reason.message
          : String(yandexResult.reason),
    });
  }

  if (results.length === 0) {
    throw new Error(
      "Ни один ASR провайдер не вернул результат (проверьте API ключи)",
    );
  }

  const { text: rawText, source } = selectBest(results);
  const processingTimeMs = Date.now() - start;

  const durationInSeconds = results
    .map((r) => (r.raw as { durationInSeconds?: number })?.durationInSeconds)
    .find((d): d is number => typeof d === "number");

  const metadata: TranscriptMetadata = {
    asrSource: source,
    processingTimeMs,
    confidence: results[0]?.confidence,
    speakerCount: results[0]?.utterances?.length,
    durationInSeconds,
    asrAssemblyai:
      assemblyaiResult.status === "fulfilled" && assemblyaiResult.value
        ? {
            confidence: assemblyaiResult.value.confidence,
            hasUtterances: !!assemblyaiResult.value.utterances?.length,
          }
        : undefined,
    asrYandex:
      yandexResult.status === "fulfilled" && yandexResult.value
        ? { processingTimeMs: yandexResult.value.processingTimeMs }
        : undefined,
  };

  let normalizedText = rawText;
  if (!options?.skipNormalization && rawText.trim().length > 0) {
    normalizedText = await normalizeWithLlm(rawText);
  }

  let summary: string | undefined;
  let sentiment: string | undefined;
  let title: string | undefined;
  let callTopic: string | undefined;

  if (normalizedText.trim().length > 0) {
    const analysis = await summarizeWithLlm(normalizedText, {
      summaryPrompt: options?.summaryPrompt,
    });
    summary = analysis.summary;
    sentiment = analysis.sentiment;
    title = analysis.title;
    callTopic = analysis.callTopic;
  }

  logger.info("Конвейер завершён", {
    processingTimeMs,
    asrSource: source,
    rawLength: rawText.length,
    normalizedLength: normalizedText.length,
    hasSummary: !!summary,
  });

  return {
    rawText,
    normalizedText,
    metadata,
    summary,
    sentiment,
    title,
    callTopic,
  };
}
