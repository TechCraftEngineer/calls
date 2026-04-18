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
 * Кэш сохраняется для lifetime pipeline и должен быть очищен явно.
 */
export async function getOrDownloadAudio(
  fileId: string,
  downloadFn: (id: string) => Promise<AudioFileResult>,
): Promise<AudioFileResult> {
  const cached = downloadCache.get(fileId);
  if (cached) {
    return cached;
  }

  // Создаем promise через Promise.resolve().then() для захвата синхронных ошибок
  const downloadPromise = Promise.resolve().then(() => downloadFn(fileId));

  // Сразу сохраняем в кэш до того, как promise начнет выполняться
  downloadCache.set(fileId, downloadPromise);

  return downloadPromise;
}

/**
 * Удаляет конкретный файл из кэша загрузок.
 * Используйте для явной очистки после завершения pipeline.
 */
export function removeDownloadFromCache(fileId: string): void {
  downloadCache.delete(fileId);
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
