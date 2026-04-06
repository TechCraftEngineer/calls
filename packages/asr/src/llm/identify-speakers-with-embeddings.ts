/**
 * Идентификация спикеров с использованием speaker embeddings.
 * Комбинирует данные эмбеддингов из giga-am с LLM-анализом для точного определения ролей.
 */

import { generateWithAi, hasAiProviderConfigured } from "@calls/ai";
import { createLogger } from "@calls/logger";
import { Output } from "ai";
import { z } from "zod";

const logger = createLogger("asr-identify-speakers-embeddings");
const MAX_ANALYSIS_CHARS = 20_000;

interface SpeakerCluster {
  speakerId: string;
  segmentCount: number;
  totalDuration: number;
  avgEmbedding?: number[];
  sampleTexts: string[];
  avgConfidence?: number;
}

const speakerSchema = z.object({
  speakerId: z.string().describe('ID спикера из транскрипта, напр. "SPEAKER_01"'),
  role: z.enum(["operator", "client"]).describe("Роль: operator или client"),
  name: z.string().describe("Имя, если упоминается; иначе пустая строка"),
  confidence: z.number().min(0).max(1).describe("Уверенность в определении роли (0-1)"),
  reasoning: z.string().optional().describe("Краткое объяснение почему выбрана эта роль"),
});

const schema = z.object({
  speakers: z.array(speakerSchema).describe("Массив спикеров с ролью и именем"),
  operatorName: z.string().optional().describe("Имя оператора"),
  customerName: z.string().optional().describe("Имя клиента"),
});

export interface IdentifySpeakersWithEmbeddingsOptions {
  direction?: string | null;
  managerName?: string | null;
  workspaceId: string;
  speakerTimeline?: Array<{
    speaker: string;
    start: number;
    end: number;
    text: string;
    overlap?: boolean;
  }>;
  segments?: Array<{
    speaker?: string;
    start?: number;
    end?: number;
    text?: string;
    embedding?: number[] | null;
    confidence?: number | null;
  }>;
}

export interface IdentifySpeakersWithEmbeddingsResult {
  text: string;
  operatorName?: string;
  customerName?: string;
  metadata?: {
    success: boolean;
    reason?:
      | "empty_input"
      | "ai_provider_not_configured"
      | "error"
      | "no_embeddings"
      | "timeout"
      | "fallback_simple";
    error?: string;
    mapping?: Record<string, string>;
    speakers?: z.infer<typeof speakerSchema>[];
    operatorName?: string | null;
    customerName?: string | null;
    truncatedForAnalysis?: boolean;
    usedEmbeddings?: boolean;
    clusterCount?: number;
    fallbackReason?: string;
    fallbackAttempted?: boolean;
    errorCode?: string;
  };
}

function analyzeSpeakerClusters(
  segments: Array<{
    speaker?: string;
    start?: number;
    end?: number;
    text?: string;
    embedding?: number[] | null;
    confidence?: number | null;
  }>,
): Map<string, SpeakerCluster> {
  const clusters = new Map<string, SpeakerCluster>();

  for (const seg of segments) {
    const speakerId = seg.speaker || "SPEAKER_01";
    const start = seg.start ?? 0;
    const end = seg.end ?? start;
    const duration = Math.max(0, end - start);
    const text = seg.text?.trim() || "";
    const confidence = seg.confidence ?? 0.5;

    if (!clusters.has(speakerId)) {
      clusters.set(speakerId, {
        speakerId,
        segmentCount: 0,
        totalDuration: 0,
        sampleTexts: [],
        avgConfidence: 0,
      });
    }

    const cluster = clusters.get(speakerId);
    if (!cluster) continue;

    cluster.segmentCount++;
    cluster.totalDuration += duration;

    // Обновляем среднюю уверенность
    if (cluster.avgConfidence !== undefined) {
      cluster.avgConfidence =
        (cluster.avgConfidence * (cluster.segmentCount - 1) + confidence) / cluster.segmentCount;
    }

    if (text && cluster.sampleTexts.length < 5) {
      cluster.sampleTexts.push(text);
    }

    if (seg.embedding && Array.isArray(seg.embedding) && seg.embedding.length > 0) {
      if (!cluster.avgEmbedding) {
        cluster.avgEmbedding = [...seg.embedding];
      } else {
        const currentAvg = cluster.avgEmbedding;
        const newEmb = seg.embedding;
        const minLen = Math.min(currentAvg.length, newEmb.length);
        for (let i = 0; i < minLen; i++) {
          const avgVal = currentAvg[i];
          const newVal = newEmb[i];
          if (avgVal !== undefined && newVal !== undefined) {
            currentAvg[i] = (avgVal * (cluster.segmentCount - 1) + newVal) / cluster.segmentCount;
          }
        }
      }
    }
  }

  return clusters;
}

function buildClusterAnalysisPrompt(clusters: Map<string, SpeakerCluster>): string {
  const lines: string[] = ["Анализ кластеров спикеров:"];

  for (const [speakerId, cluster] of clusters.entries()) {
    lines.push(`\n${speakerId}:`);
    lines.push(`- Количество сегментов: ${cluster.segmentCount}`);
    lines.push(`- Общая длительность: ${cluster.totalDuration.toFixed(1)}с`);
    lines.push(
      `- Средняя уверенность кластеризации: ${((cluster.avgConfidence ?? 0.5) * 100).toFixed(0)}%`,
    );
    lines.push(`- Есть эмбеддинги: ${cluster.avgEmbedding ? "да" : "нет"}`);
    if (cluster.sampleTexts.length > 0) {
      lines.push(`- Примеры реплик:`);
      cluster.sampleTexts.forEach((text, idx) => {
        lines.push(`  ${idx + 1}. "${text.slice(0, 100)}${text.length > 100 ? "..." : ""}"`);
      });
    }
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `Ты эксперт по анализу телефонных разговоров. Определи роль каждого спикера используя:
1. Данные кластеризации по голосовым эмбеддингам (включая уверенность кластеризации)
2. Контекст и содержание реплик
3. Паттерны поведения в диалоге

ПРАВИЛА:
- Возвращай ТОЛЬКО JSON в требуемой структуре
- speakerId должен точно соответствовать ID из транскрипта (SPEAKER_01, SPEAKER_02 и т.д.)
- role: только "operator" или "client"
- name: имя только если явно упоминается в разговоре
- confidence: оценка уверенности от 0 до 1 (учитывай уверенность кластеризации)
- reasoning: краткое объяснение выбора роли (1-2 предложения)

ПРИЗНАКИ ОПЕРАТОРА:
- Представляется от компании
- Ведёт разговор, задаёт уточняющие вопросы
- Предлагает решения, проверяет данные
- Обычно говорит больше по времени
- Высокая уверенность кластеризации (>70%) указывает на постоянного спикера

ПРИЗНАКИ КЛИЕНТА:
- Обращается с запросом или проблемой
- Отвечает на вопросы оператора
- Может быть менее активен в разговоре
- Низкая уверенность кластеризации (<50%) может указывать на короткие реплики`;

export async function identifySpeakersWithEmbeddings(
  normalizedText: string,
  options: IdentifySpeakersWithEmbeddingsOptions,
): Promise<IdentifySpeakersWithEmbeddingsResult> {
  if (!normalizedText?.trim()) {
    return {
      text: normalizedText,
      metadata: {
        success: false,
        reason: "empty_input",
      },
    };
  }

  if (!hasAiProviderConfigured()) {
    logger.warn("API ключ AI не задан, пропускаем анализ спикеров");
    return {
      text: normalizedText,
      metadata: {
        success: false,
        reason: "ai_provider_not_configured",
      },
    };
  }

  const hasEmbeddingData = Boolean(options.segments && options.segments.length > 0);
  const clusters =
    hasEmbeddingData && options.segments ? analyzeSpeakerClusters(options.segments) : new Map();

  const analysisText =
    normalizedText.length > MAX_ANALYSIS_CHARS
      ? normalizedText.slice(0, MAX_ANALYSIS_CHARS)
      : normalizedText;

  const clusterAnalysis = clusters.size > 0 ? buildClusterAnalysisPrompt(clusters) : "";

  const systemPrompt = `${SYSTEM_PROMPT}${options.managerName ? `\n\nПодсказка: оператор может представляться как ${options.managerName}.` : ""}${options.direction ? `\nНаправление звонка: ${options.direction}` : ""}`;

  const start = Date.now();

  try {
    const response = await generateWithAi({
      modelProfile: "cheap",
      system: systemPrompt,
      prompt: `${clusterAnalysis ? `${clusterAnalysis}\n\n` : ""}Транскрипт разговора:
---
${analysisText}
---

Определи роль каждого спикера и верни JSON по схеме.`,
      output: Output.object({ schema }),
      temperature: 0.2,
      maxRetries: 3,
      abortSignal: AbortSignal.timeout(60_000),
      functionId: "asr-identify-speakers-embeddings",
      timeout: 60_000,
    });

    let result: z.infer<typeof schema>;
    try {
      result = response.output;
    } catch (outputError) {
      const msg = outputError instanceof Error ? outputError.message : String(outputError);
      if (msg.includes("No output generated") && response.text?.trim()) {
        result = schema.parse(JSON.parse(response.text));
      } else {
        throw outputError;
      }
    }

    const operatorName = result.operatorName?.trim() || undefined;
    const customerName = result.customerName?.trim() || undefined;

    const sanitizedMapping: Record<string, string> = {};
    for (const s of result.speakers ?? []) {
      const id = s.speakerId?.trim();
      if (!id) continue;
      const name = s.name?.trim();
      const isOperator = s.role?.toLowerCase() === "operator";
      const label = isOperator
        ? name
          ? `Оператор: ${name}`
          : "Оператор"
        : name
          ? `Клиент: ${name}`
          : "Клиент";
      sanitizedMapping[id] = label;
    }

    if (Object.keys(sanitizedMapping).length === 0) {
      logger.info("Маппинг спикеров пуст, возвращаем исходный текст");
      return {
        text: normalizedText,
        operatorName,
        customerName,
        metadata: {
          success: true,
          mapping: sanitizedMapping,
          speakers: result.speakers,
          operatorName: operatorName ?? null,
          customerName: customerName ?? null,
          truncatedForAnalysis: normalizedText.length > analysisText.length,
          usedEmbeddings: hasEmbeddingData,
          clusterCount: clusters.size,
        },
      };
    }

    let resultText = normalizedText;
    for (const [from, to] of Object.entries(sanitizedMapping)) {
      if (from && to) {
        const regex = new RegExp(`^(${escapeRegex(from)}):\\s*`, "gm");
        resultText = resultText.replace(regex, `${to}: `);
      }
    }

    logger.info("Анализ спикеров с эмбеддингами завершён", {
      processingTimeMs: Date.now() - start,
      mappingKeys: Object.keys(sanitizedMapping).length,
      truncatedForAnalysis: normalizedText.length > analysisText.length,
      operatorName: operatorName ?? null,
      customerName: customerName ?? null,
      usedEmbeddings: hasEmbeddingData,
      clusterCount: clusters.size,
    });

    return {
      text: resultText.trim(),
      operatorName,
      customerName,
      metadata: {
        success: true,
        mapping: sanitizedMapping,
        speakers: result.speakers,
        operatorName: operatorName ?? null,
        customerName: customerName ?? null,
        truncatedForAnalysis: normalizedText.length > analysisText.length,
        usedEmbeddings: hasEmbeddingData,
        clusterCount: clusters.size,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeout = errorMessage.includes("TIMEOUT") || errorMessage.includes("timed out");
    const errorCode = (error as Error & { code?: string })?.code;

    logger.error("Ошибка анализа спикеров с эмбеддингами", {
      error: errorMessage,
      errorCode,
      isTimeout,
      hasEmbeddingData,
      clusterCount: clusters.size,
      analysisTextLength: analysisText.length,
      originalTextLength: normalizedText.length,
    });

    // Если это таймаут, попробуем упрощенный анализ без эмбеддингов
    if (isTimeout && hasEmbeddingData) {
      logger.info("Пробуем упрощенный анализ без эмбеддингов из-за таймаута");
      try {
        const simpleResponse = await generateWithAi({
          modelProfile: "cheap",
          system:
            "Определи роль спикеров в транскрипте. Верни JSON: {speakers: [{speakerId, role, name, confidence}], operatorName, customerName}",
          prompt: `Транскрипт:\n${analysisText.slice(0, 5000)}\n\nОпредели роли спикеров.`,
          output: Output.object({ schema }),
          temperature: 0.1,
          maxRetries: 2,
          abortSignal: AbortSignal.timeout(45_000),
          timeout: 45_000,
          functionId: "asr-identify-speakers-simple",
        });

        const result = simpleResponse.output;
        const operatorName = result.operatorName?.trim() || result.speakers?.find((s: { role: string; }) => s.role === 'operator')?.name?.trim() || undefined;
        const customerName = result.customerName?.trim() || result.speakers?.find((s: { role: string; }) => s.role === 'client')?.name?.trim() || undefined;

        logger.info("Упрощенный анализ спикеров завершен успешно", {
          operatorName,
          customerName,
        });

        return {
          text: normalizedText,
          operatorName,
          customerName,
          metadata: {
            success: true,
            reason: "fallback_simple",
            speakers: result.speakers,
            operatorName: operatorName ?? null,
            customerName: customerName ?? null,
            usedEmbeddings: false,
            clusterCount: 0,
            fallbackReason: "timeout",
          },
        };
      } catch (fallbackError) {
        logger.error("Упрощенный анализ также завершился ошибкой", {
          fallbackError:
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });
      }
    }

    return {
      text: normalizedText,
      metadata: {
        success: false,
        reason: isTimeout ? "timeout" : "error",
        error: errorMessage,
        errorCode,
        usedEmbeddings: hasEmbeddingData,
        clusterCount: clusters.size,
        fallbackAttempted: isTimeout && hasEmbeddingData,
      },
    };
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
