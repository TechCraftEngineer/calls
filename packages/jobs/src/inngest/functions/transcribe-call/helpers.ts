/**
 * Вспомогательные функции для транскрибации звонков
 */

import { identifySpeakersWithEmbeddings } from "@calls/asr/llm/identify-speakers-with-embeddings";
import { env } from "@calls/config";
import { filesService, pbxRepository, workspaceIntegrationsRepository } from "@calls/db";
import { getDownloadUrlForAsr } from "@calls/lib";
import { createLogger } from "../../../logger";
import { z } from "zod";
import { FileSchema, GigaAmResponseSchema, TranscriptionSegmentSchema } from "./schemas";

const logger = createLogger("transcribe-call-helpers");

export async function resolveManagerFromPbx(call: {
  workspaceId: string;
  internalNumber?: string | null;
}): Promise<string | null> {
  try {
    const pbxIntegration = await workspaceIntegrationsRepository.getByWorkspaceAndType(
      call.workspaceId,
      "megapbx",
    );

    if (!pbxIntegration?.enabled) {
      return null;
    }

    const rawProvider =
      typeof pbxIntegration.config === "object" &&
      pbxIntegration.config !== null &&
      "provider" in pbxIntegration.config
        ? pbxIntegration.config.provider
        : undefined;
    const integrationProvider = typeof rawProvider === "string" ? rawProvider.trim() : "megapbx";

    if (!integrationProvider) {
      logger.warn("PBX integration provider is missing", {
        workspaceId: call.workspaceId,
      });
      return null;
    }

    const pbxNumbers = await pbxRepository.listNumbers(call.workspaceId, integrationProvider);
    const activePbxNumbers = pbxNumbers.filter((number) => number.isActive);
    const normalizedInternalNumber = call.internalNumber?.trim() || null;

    const matchedByInternalNumber = normalizedInternalNumber
      ? activePbxNumbers.find(
          (number) => (number.extension?.trim() || null) === normalizedInternalNumber,
        )
      : undefined;

    const matchedNumber = matchedByInternalNumber;
    const managerName =
      matchedNumber?.label?.trim() ||
      matchedNumber?.extension?.trim() ||
      matchedNumber?.phoneNumber?.trim() ||
      null;

    return managerName;
  } catch (error) {
    logger.warn("Не удалось определить менеджера из pbx_numbers", {
      workspaceId: call.workspaceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export interface AsrResult {
  segments: Array<{
    speaker: string;
    start: number;
    end: number;
    text: string;
    embedding?: number[];
    confidence?: number;
  }>;
  transcript: string;
  validationFailed?: boolean;
  validationError?: string;
  metadata: {
    asrLogs: Array<{
      provider: string;
      utterances: z.infer<typeof TranscriptionSegmentSchema>[];
      raw: unknown;
    }>;
  };
}

export async function downloadAudioFile(fileId: string): Promise<{ buffer: ArrayBuffer; filename: string }> {
  const file = await filesService.getFileById(fileId);
  if (!file) {
    throw new Error(`Файл не найден: ${fileId}`);
  }

  const fileValidation = FileSchema.safeParse(file);
  if (!fileValidation.success) {
    const errorDetails = fileValidation.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");
    throw new Error(`File validation failed: ${errorDetails}`);
  }

  const asrAudioUrl = await getDownloadUrlForAsr(file.storageKey);

  // Проверяем размер файла перед загрузкой
  const headResponse = await fetch(asrAudioUrl, { method: "HEAD" });
  if (!headResponse.ok) {
    throw new Error(`Не удалось получить информацию о файле: ${headResponse.status}`);
  }

  const contentLength = headResponse.headers.get("content-length");
  if (contentLength) {
    const fileSizeBytes = parseInt(contentLength, 10);
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    if (fileSizeBytes > maxFileSize) {
      throw new Error(
        `Размер файла (${Math.round(fileSizeBytes / 1024 / 1024)}MB) превышает лимит (${Math.round(maxFileSize / 1024 / 1024)}MB)`,
      );
    }
  }

  const audioResponse = await fetch(asrAudioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Не удалось скачать аудио: ${audioResponse.status}`);
  }
  const audioBuffer = await audioResponse.arrayBuffer();

  // Дополнительная проверка размера после загрузки
  if (audioBuffer.byteLength > 100 * 1024 * 1024) {
    throw new Error(
      `Размер аудиоданных (${Math.round(audioBuffer.byteLength / 1024 / 1024)}MB) превышает лимит (100MB)`,
    );
  }

  return {
    buffer: audioBuffer,
    filename: file.filename || "audio.wav",
  };
}

// Legacy функция для обратной совместимости
export async function downloadAudioBuffer(fileId: string): Promise<{ buffer: string; filename: string }> {
  const { buffer, filename } = await downloadAudioFile(fileId);
  // Конвертируем в Base64 для совместимости с Inngest
  const base64Buffer = Buffer.from(buffer).toString('base64');
  return {
    buffer: base64Buffer,
    filename,
  };
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  baseDelayMs = 1000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || attempt === retries) return response;
      // retry on 5xx only
      if (response.status < 500) return response;
      logger.warn(`GigaAM transient error, retrying (attempt: ${attempt}, status: ${response.status}, url: ${url})`);
    } catch (err) {
      if (attempt === retries) throw err;
      logger.warn(`GigaAM network error, retrying (attempt: ${attempt}, err: ${err}, url: ${url})`);
    }
    
    // Добавляем jitter для предотвращения thundering-herd
    const delay = baseDelayMs * 2 ** attempt;
    const jitteredDelay = delay * (0.5 + Math.random());
    await new Promise(resolve => setTimeout(resolve, jitteredDelay));
  }
  throw new Error("fetchWithRetry: unreachable");
}

async function processAudioWithGigaAm(
  audioBuffer: ArrayBuffer,
  filename: string,
  diarization: boolean,
): Promise<AsrResult> {

  const gigaAmUrl = env.GIGA_AM_TRANSCRIBE_URL;
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/wav" });
  
  // Используем реальное имя файла или fallback на "audio.wav"
  const audioFilename = filename && filename.trim() ? filename : "audio.wav";
  formData.append("file", blob, audioFilename);
  formData.append("filename", audioFilename);
  formData.append("diarization", diarization.toString());

  const response = await fetchWithRetry(`${gigaAmUrl}/api/transcribe-sync`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(env.GIGA_AM_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`GigaAM API error: ${response.status} ${response.statusText}`);
  }

  const gigaResult = await response.json();

  // Валидация ответа в зависимости от режима
  if (diarization) {
    if (!gigaResult.segments || !Array.isArray(gigaResult.segments)) {
      logger.warn("GigaAM API не вернул сегменты с диаризацией", {
        filename,
        response: gigaResult,
      });
      throw new Error("GigaAM API не поддерживает диаризацию в текущей конфигурации");
    }
  } else {
    if (!gigaResult.final_transcript && !gigaResult.text) {
      logger.warn("GigaAM API не вернул текст транскрипции", {
        filename,
        response: gigaResult,
      });
      throw new Error("GigaAM API не вернул текст транскрипции");
    }
  }

  const gigaValidation = GigaAmResponseSchema.safeParse(gigaResult);
  if (!gigaValidation.success) {
    const errorDetails = gigaValidation.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    logger.warn("GigaAM response validation failed", {
      filename,
      errorDetails,
      response: gigaResult,
    });
    
    // Создаем безопасный fallback объект вместо использования невалидированных данных
    const validatedGigaResult = {
      segments: diarization ? [] : undefined,
      final_transcript: "",
      text: "",
    };
    
    return {
      segments: diarization ? validatedGigaResult.segments || [] : [],
      transcript: validatedGigaResult.final_transcript || validatedGigaResult.text || "",
      validationFailed: true,
      validationError: `GigaAM response validation failed: ${errorDetails}`,
      metadata: {
        asrLogs: [
          {
            provider: diarization ? "gigaam-diarized" : "gigaam-non-diarized",
            utterances: diarization ? [] : [],
            raw: gigaResult,
          },
        ],
      },
    };
  }

  const validatedGigaResult = gigaValidation.data;

  return {
    segments: diarization ? validatedGigaResult.segments || [] : [],
    transcript: validatedGigaResult.final_transcript || "",
    validationFailed: false,
    metadata: {
      asrLogs: [
        {
          provider: diarization ? "gigaam-diarized" : "gigaam-non-diarized",
          utterances: diarization ? gigaResult.segments || [] : [],
          raw: gigaResult,
        },
      ],
    },
  };
}

export async function processAudioWithGigaAmDiarized(
  audioBuffer: ArrayBuffer,
  filename: string,
): Promise<AsrResult> {
  return processAudioWithGigaAm(audioBuffer, filename, true);
}

export async function processAudioWithGigaAmNonDiarized(
  audioBuffer: ArrayBuffer,
  filename: string,
): Promise<Omit<AsrResult, "segments"> & { segments: [] }> {
  const result = await processAudioWithGigaAm(audioBuffer, filename, false);
  return {
    ...result,
    segments: [], // Явно указываем пустые сегменты для non-diarized
  };
}

export function extractSpeakerTimeline(gigaAmRaw: unknown):
  | Array<{
      speaker: string;
      start: number;
      end: number;
      text: string;
      overlap?: boolean;
    }>
  | undefined {
  const raw = gigaAmRaw as { speakerTimeline?: unknown } | undefined;

  if (!raw?.speakerTimeline || !Array.isArray(raw.speakerTimeline)) {
    return undefined;
  }

  return raw.speakerTimeline.map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const entry = item as Record<string, unknown>;
      return {
        speaker: typeof entry.speaker === "string" ? entry.speaker : "SPEAKER_01",
        start: typeof entry.start === "number" ? entry.start : 0,
        end: typeof entry.end === "number" ? entry.end : 0,
        text: typeof entry.text === "string" ? entry.text : "",
        overlap: typeof entry.overlap === "boolean" ? entry.overlap : undefined,
      };
    }
    return {
      speaker: "SPEAKER_01",
      start: 0,
      end: 0,
      text: "",
    };
  });
}

export function extractSegmentsFromUtterances(utterances: unknown[]):
  | Array<{
      speaker: string;
      start: number;
      end: number;
      text: string;
      embedding?: number[];
      confidence?: number;
    }>
  | undefined {
  if (!Array.isArray(utterances)) {
    return undefined;
  }

  return utterances.map((u) => {
    const utterance = u as Record<string, unknown>;
    const embedding = Array.isArray(utterance.embedding)
      ? (utterance.embedding as number[])
      : undefined;
    const confidence = typeof utterance.confidence === "number" ? utterance.confidence : undefined;
    return {
      speaker: typeof utterance.speaker === "string" ? utterance.speaker : "",
      start: typeof utterance.start === "number" ? utterance.start : 0,
      end: typeof utterance.end === "number" ? utterance.end : 0,
      text: typeof utterance.text === "string" ? utterance.text : "",
      embedding,
      confidence,
    };
  });
}

export async function identifySpeakers(
  call: {
    direction: string;
    name?: string | null;
    workspaceId: string;
  },
  result: {
    normalizedText: string;
    metadata: {
      asrLogs?: Array<{
        provider: string;
        utterances?: unknown[];
        raw?: unknown;
      }>;
    };
  },
  managerNameFromPbx: string | null,
) {
  const fallbackManagerName = call.name?.trim() || null;

  // Извлекаем данные из giga-am результата
  const gigaAmLog = result.metadata.asrLogs?.find(
    (log) => log.provider === "gigaam-diarized" || log.provider === "gigaam"
  );
  const gigaAmRaw = gigaAmLog?.raw;

  // Безопасно извлекаем speaker_timeline
  const speakerTimeline = extractSpeakerTimeline(gigaAmRaw);

  // Извлекаем utterances с эмбеддингами и confidence
  const utterances = gigaAmLog?.utterances;
  const segments = extractSegmentsFromUtterances(utterances || []);

  return identifySpeakersWithEmbeddings(result.normalizedText, {
    direction: call.direction,
    managerName: managerNameFromPbx ?? fallbackManagerName,
    workspaceId: call.workspaceId,
    speakerTimeline,
    segments,
  });
}

export function serializeMetadata(
  resultMetadata: unknown,
  identifyResultMetadata: unknown,
  operatorName?: string | null,
): Record<string, unknown> {
  let serializedMetadata: Record<string, unknown> = {};

  try {
    // Безопасная сериализация с фильтрацией опасных полей
    if (resultMetadata && typeof resultMetadata === "object") {
      serializedMetadata = safeDeepClone(resultMetadata) as Record<string, unknown>;
    }
    if (operatorName != null && operatorName !== "") {
      serializedMetadata.operatorName = operatorName;
    }
    if (identifyResultMetadata && typeof identifyResultMetadata === "object") {
      serializedMetadata.diarization = safeDeepClone(identifyResultMetadata);
    }
  } catch (error) {
    logger.warn("Ошибка сериализации метаданных", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return serializedMetadata;
}

/**
 * Безопасное глубокое клонирование объекта с защитой от prototype pollution
 */
function safeDeepClone(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => safeDeepClone(item));
  }

  if (typeof obj === "object") {
    const cloned: Record<string, unknown> = {};
    for (const key in obj) {
      // Защита от prototype pollution
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        continue;
      }
      if (Object.hasOwn(obj, key)) {
        cloned[key] = safeDeepClone((obj as Record<string, unknown>)[key]);
      }
    }
    return cloned;
  }

  return obj;
}
