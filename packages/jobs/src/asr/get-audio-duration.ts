/**
 * Извлечение длительности аудио через music-metadata (чистый JS, без внешних бинарников).
 * Поддерживает MP3, M4A, WAV, OGG, FLAC и др.
 * @see https://github.com/Borewit/music-metadata
 */

import { parseBuffer } from "music-metadata";
import { createLogger } from "../logger";
import { safeAudioUrlParts } from "./audio-preprocessing";

const logger = createLogger("asr-audio-duration");

/**
 * Возвращает длительность аудио в секундах по буферу (например, после загрузки с FTP).
 * Не зависит от ASR/LLM сервисов.
 */
export async function getAudioDurationFromBuffer(
  buffer: Buffer,
): Promise<number | undefined> {
  try {
    const metadata = await parseBuffer(buffer, undefined, { duration: true });
    const duration = metadata.format.duration;

    if (typeof duration === "number" && duration > 0) {
      return Math.round(duration * 10) / 10;
    }
    return undefined;
  } catch (err) {
    logger.warn("Ошибка при определении длительности аудио из буфера", {
      size: buffer.length,
      error: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}

/**
 * Возвращает длительность аудио в секундах по URL.
 * Не зависит от ASR/LLM сервисов.
 */
export async function getAudioDurationFromUrl(
  audioUrl: string,
): Promise<number | undefined> {
  try {
    const res = await fetch(audioUrl, {
      headers: { Accept: "audio/*" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const safe = safeAudioUrlParts(audioUrl);
      logger.warn("Не удалось загрузить аудио для определения длительности", {
        host: safe.host,
        basename: safe.basename,
        status: res.status,
      });
      return undefined;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const metadata = await parseBuffer(buffer, undefined, { duration: true });
    const duration = metadata.format.duration;

    if (typeof duration === "number" && duration > 0) {
      return Math.round(duration * 10) / 10;
    }
    return undefined;
  } catch (err) {
    const safe = safeAudioUrlParts(audioUrl);
    logger.warn("Ошибка при определении длительности аудио", {
      host: safe.host,
      basename: safe.basename,
      error: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}
