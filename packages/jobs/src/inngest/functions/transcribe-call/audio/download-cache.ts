/**
 * Кэш для загрузки аудио файлов в рамках одного pipeline.
 * Предотвращает множественную загрузку одного и того же файла
 * при использовании в нескольких шагах транскрибации.
 */

import type { AudioFileResult } from "../types";

// Map для хранения промисов загрузки файлов
// Ключ: fileId, Значение: Promise<AudioFileResult>
const downloadCache = new Map<string, Promise<AudioFileResult>>();

/**
 * Получает файл из кэша или загружает его.
 * Все запросы к одному fileId получают один и тот же промис,
 * гарантируя единичную загрузку файла.
 */
export async function getOrDownloadAudio(
  fileId: string,
  downloadFn: (id: string) => Promise<AudioFileResult>,
): Promise<AudioFileResult> {
  const cached = downloadCache.get(fileId);
  if (cached) {
    return cached;
  }

  const downloadPromise = downloadFn(fileId).finally(() => {
    // Очищаем кэш после завершения (успех или ошибка)
    // чтобы не держать буферы в памяти бесконечно
    downloadCache.delete(fileId);
  });

  downloadCache.set(fileId, downloadPromise);
  return downloadPromise;
}

/**
 * Очищает весь кэш загрузок.
 * Полезно для тестирования или при необходимости сбросить состояние.
 */
export function clearDownloadCache(): void {
  downloadCache.clear();
}

/**
 * Возвращает размер текущего кэша (для мониторинга).
 */
export function getDownloadCacheSize(): number {
  return downloadCache.size;
}
