/**
 * Загрузка аудио файлов для транскрибации
 */

import { filesService } from "@calls/db";
import { getDownloadUrlForAsr } from "@calls/lib";
import { createLogger } from "../../../../logger";
import { FileSchema } from "../schemas";
import type { AudioBufferLegacyResult, AudioFileResult } from "../types";
import type { z } from "zod";

const logger = createLogger("audio-download");
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function downloadAudioFile(fileId: string): Promise<AudioFileResult> {
  const file = await filesService.getFileById(fileId);
  if (!file) {
    throw new Error(`Файл не найден: ${fileId}`);
  }

  const fileValidation = FileSchema.safeParse(file);
  if (!fileValidation.success) {
    const errorDetails = fileValidation.error.issues
      .map((issue: z.ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
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
    if (fileSizeBytes > MAX_FILE_SIZE) {
      throw new Error(
        `Размер файла (${Math.round(fileSizeBytes / 1024 / 1024)}MB) превышает лимит (${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`,
      );
    }
  }

  const audioResponse = await fetch(asrAudioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Не удалось скачать аудио: ${audioResponse.status}`);
  }
  const audioBuffer = await audioResponse.arrayBuffer();

  // Дополнительная проверка размера после загрузки
  if (audioBuffer.byteLength > MAX_FILE_SIZE) {
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
export async function downloadAudioBuffer(fileId: string): Promise<AudioBufferLegacyResult> {
  const { buffer, filename } = await downloadAudioFile(fileId);
  // Конвертируем в Base64 для совместимости с Inngest
  const base64Buffer = Buffer.from(buffer).toString("base64");
  return {
    buffer: base64Buffer,
    filename,
  };
}
