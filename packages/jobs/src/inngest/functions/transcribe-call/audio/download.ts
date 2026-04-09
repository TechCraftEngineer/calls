/**
 * Загрузка аудио файлов для транскрибации с потоковой проверкой размера
 */

import { filesService } from "@calls/db";
import { getDownloadUrlForAsr } from "@calls/lib";
import type { z } from "zod";
import { createLogger } from "~/logger";
import { FileSchema } from "~/inngest/functions/transcribe-call/schemas";
import type { AudioBufferLegacyResult, AudioFileResult } from "~/inngest/functions/transcribe-call/types";

const logger = createLogger("audio-download");
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

async function streamWithSizeLimit(url: string, maxBytes: number): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 минут таймаут

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Не удалось скачать аудио: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body не доступен для чтения");
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalBytes += value.length;

        // Проверяем лимит размера
        if (totalBytes > maxBytes) {
          controller.abort();
          throw new Error(
            `Размер аудиоданных (${Math.round(totalBytes / 1024 / 1024)}MB) превышает лимит (100MB)`,
          );
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Объединяем чанки в один ArrayBuffer
    const result = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result.buffer;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function downloadAudioFile(fileId: string): Promise<AudioFileResult> {
  logger.info("Начало загрузки аудио файла", { fileId });

  const file = await filesService.getFileById(fileId);
  if (!file) {
    throw new Error(`Файл не найден: ${fileId}`);
  }

  logger.info("Файл найден", { fileId, filename: file.filename });

  const fileValidation = FileSchema.safeParse(file);
  if (!fileValidation.success) {
    const errorDetails = fileValidation.error.issues
      .map((issue: z.core.$ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`File validation failed: ${errorDetails}`);
  }

  const asrAudioUrl = await getDownloadUrlForAsr(file.storageKey);

  logger.info("Начало скачивания аудио", { fileId, storageKey: file.storageKey });

  // Проверяем размер файла перед загрузкой через HEAD запрос
  const headResponse = await fetch(asrAudioUrl, { method: "HEAD" });
  if (!headResponse.ok) {
    throw new Error(`Не удалось получить информацию о файле: ${headResponse.status}`);
  }

  const contentLength = headResponse.headers.get("content-length");
  if (contentLength) {
    const fileSizeBytes = parseInt(contentLength, 10);
    if (fileSizeBytes > MAX_FILE_SIZE) {
      throw new Error(
        `Размер файла (${Math.round(fileSizeBytes / 1024 / 1024)}MB) превышает лимит (${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`,
      );
    }
  }

  // Потоковая загрузка с проверкой размера
  const buffer = await streamWithSizeLimit(asrAudioUrl, MAX_FILE_SIZE);

  logger.info("Аудио успешно загружено", {
    fileId,
    size: buffer.byteLength,
    filename: file.filename || "audio.wav",
  });

  return {
    buffer,
    filename: file.filename || "audio.wav",
  };
}

// Legacy функция для обратной совместимости
export async function downloadAudioBuffer(fileId: string): Promise<AudioBufferLegacyResult> {
  const { buffer, filename } = await downloadAudioFile(fileId);
  // Конвертируем в Base64 для совместимости с Inngest
  const base64Buffer = Buffer.from(buffer).toString("base64");
  return {
    buffer: base64Buffer,
    filename,
  };
}
