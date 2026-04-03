/**
 * Загрузка записей с Megafon PBX FTP.
 * Структура на FTP: recordings/{YYYY-MM-DD}/{filename}.mp3
 */

import { Writable } from "node:stream";
import { getAudioDurationFromBuffer } from "@calls/asr/audio/get-audio-duration";
import { callsService, filesService } from "@calls/db";
import { validateFtpCredentials } from "@calls/shared";
import { Client } from "basic-ftp";
import pLimit from "p-limit";
import { createLogger } from "~/logger";
import { parseMegafonFilename } from "~/megafon/parse-filename";

const logger = createLogger("ftp-sync");

// Модуль-уровневая константа таймаута для операций
const OPERATION_TIMEOUT = 30_000; // 30 секунд для отдельных операций

/**
 * Обрабатывает один файл с FTP
 */
async function processFile(
  client: Client,
  file: { name: string },
  dateDir: string,
  workspaceId: string,
  options: { excludePhoneNumbers?: string[] } | undefined,
  result: SyncResult,
): Promise<void> {
  const relativePath = `${dateDir}/${file.name}`;

  const existing = await callsService.getCallByFilename(relativePath, workspaceId);
  if (existing) {
    result.skipped++;
    return;
  }

  const parsed = parseMegafonFilename(relativePath);
  if (!parsed) {
    const errorMsg = `Не удалось разобрать имя: ${relativePath}`;
    result.errors.push(errorMsg);
    logger.warn("Ошибка парсинга имени файла", {
      filename: relativePath,
    });
    return;
  }

  const excludeList = options?.excludePhoneNumbers ?? [];
  if (excludeList.length > 0) {
    const internalNorm = normalizePhoneForMatch(parsed.internalNumber);
    const externalNorm = normalizePhoneForMatch(parsed.externalNumber);
    const isExcluded = excludeList.some((excl) => {
      const exclNorm = normalizePhoneForMatch(excl);
      if (!exclNorm) return false;
      return (
        internalNorm === exclNorm ||
        externalNorm === exclNorm ||
        internalNorm.endsWith(exclNorm) ||
        externalNorm.endsWith(exclNorm)
      );
    });
    if (isExcluded) {
      result.skipped++;
      logger.info("Файл пропущен (номер в списке исключений)", {
        filename: relativePath,
        internalNumber: parsed.internalNumber,
        externalNumber: parsed.externalNumber,
      });
      return;
    }
  }

  try {
    // Скачиваем файл напрямую в буфер
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
    });
    const downloadBuffer = await Promise.race([
      (async () => {
        await client.downloadTo(writable, file.name);
        return Buffer.concat(chunks);
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout downloading file")), OPERATION_TIMEOUT),
      ),
    ]);

    // Валидация размера файла
    const MIN_FILE_SIZE = 1024; // 1KB
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    if (downloadBuffer.length < MIN_FILE_SIZE) {
      result.errors.push(
        `${relativePath}: Файл слишком маленький (${formatBytesRu(downloadBuffer.length)})`,
      );
      logger.warn("Файл слишком маленький", {
        filename: relativePath,
        size: downloadBuffer.length,
      });
      return;
    }

    if (downloadBuffer.length > MAX_FILE_SIZE) {
      result.errors.push(
        `${relativePath}: Файл слишком большой (${formatBytesRu(downloadBuffer.length)})`,
      );
      logger.warn("Файл слишком большой", {
        filename: relativePath,
        size: downloadBuffer.length,
      });
      return;
    }

    // Длительность определяем по уже скачанному буферу.
    let fileDurationSeconds: number | null = null;

    const duration = await getAudioDurationFromBuffer(downloadBuffer);
    if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
      fileDurationSeconds = duration;
    } else {
      logger.warn("Не удалось определить длительность записи", {
        filename: relativePath,
        duration,
      });
    }

    // Загрузка файла в S3 через FilesService
    let fileId: string | null = null;
    let storageKey: string | null = null;
    try {
      const uploadResult = await filesService.uploadCallRecording(
        workspaceId,
        relativePath,
        downloadBuffer,
        "ftp",
        fileDurationSeconds,
      );
      fileId = uploadResult.id;
      storageKey = uploadResult.storageKey;
      result.s3Uploaded++;
      logger.info("Файл успешно загружен в S3", {
        filename: relativePath,
        storageKey,
        fileId,
        size: downloadBuffer.length,
      });
    } catch (s3Error) {
      const errorMsg = `${relativePath}: Критическая ошибка загрузки в S3: ${s3Error instanceof Error ? s3Error.message : String(s3Error)}`;
      result.errors.push(errorMsg);
      logger.error("Критическая ошибка загрузки в S3", {
        filename: relativePath,
        error: s3Error instanceof Error ? s3Error.message : String(s3Error),
      });
      return;
    }

    const callId = await callsService.createCall({
      workspaceId,
      filename: relativePath,
      number: parsed.externalNumber,
      internalNumber: parsed.internalNumber,
      timestamp: parsed.timestamp,
      direction: parsed.direction,
      source: parsed.internalNumber,
      name: parsed.internalNumber,
      fileId: fileId ?? null,
    });

    result.downloaded++;
    if (callId) {
      result.createdCallIds.push(callId);
    }
    logger.info("Файл успешно обработан", {
      filename: relativePath,
      size: downloadBuffer.length,
      direction: parsed.direction,
      storageKey,
      s3Uploaded: !!storageKey,
    });
  } catch (e) {
    const errorMsg = `${relativePath}: ${e instanceof Error ? e.message : String(e)}`;
    result.errors.push(errorMsg);
    logger.error("Ошибка загрузки файла", {
      filename: relativePath,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export interface FtpConfig {
  host: string;
  user: string;
  password: string;
}

export interface SyncResult {
  downloaded: number;
  skipped: number;
  errors: string[];
  s3Uploaded: number;
  /** ID звонков, созданных в этой сессии (для последующей транскрибации) */
  createdCallIds: string[];
}

function validateFtpConfig(config: FtpConfig): string[] {
  const validation = validateFtpCredentials(config.host, config.user, config.password);
  return validation.errors;
}

/** Проверка доступа к FTP в онлайн-режиме. Возвращает ошибку или null при успехе. */
export async function testFtpConnection(
  config: FtpConfig,
): Promise<{ success: true } | { success: false; error: string }> {
  const validationErrors = validateFtpConfig(config);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: validationErrors.join(". "),
    };
  }

  const client = new Client(15_000);
  client.ftp.verbose = false;

  try {
    await client.access({
      host: config.host,
      user: config.user,
      password: config.password,
      secure: true,
      secureOptions: { rejectUnauthorized: true },
    });
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: msg.includes("ECONNREFUSED")
        ? "Сервер недоступен. Проверьте корректность хоста и порта."
        : msg.includes("ETIMEDOUT") || msg.includes("timeout")
          ? "Таймаут подключения. Проверьте сетевое подключение и корректность хоста."
          : msg.toLowerCase().includes("login") ||
              msg.toLowerCase().includes("530") ||
              msg.toLowerCase().includes("auth")
            ? "Неверный логин или пароль"
            : msg,
    };
  } finally {
    client.close();
  }
}

/** Форматирует размер файла в человекочитаемый вид с русскими единицами */
function formatBytesRu(bytes: number): string {
  if (bytes === 0) return "0 байт";
  const k = 1024;
  const sizes = ["байт", "КБ", "МБ", "ГБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = Math.round((bytes / k ** i) * 100) / 100;
  return `${size} ${sizes[i]}`;
}

/** Нормализация номера для сравнения (только цифры) */
function normalizePhoneForMatch(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function syncFtp(
  config: FtpConfig,
  workspaceId: string,
  options?: {
    dateStr?: string;
    syncFromDate?: string;
    excludePhoneNumbers?: string[];
  },
): Promise<SyncResult> {
  const result: SyncResult = {
    downloaded: 0,
    skipped: 0,
    errors: [],
    s3Uploaded: 0,
    createdCallIds: [],
  };

  // Валидация конфигурации
  const validationErrors = validateFtpConfig(config);
  if (validationErrors.length > 0) {
    result.errors.push(...validationErrors);
    logger.error("Ошибка валидации FTP конфигурации", {
      errors: validationErrors,
    });
    return result;
  }

  const client = new Client(60_000);
  client.ftp.verbose = false;

  try {
    logger.info("Подключение к FTP", { host: config.host, user: config.user });

    await client.access({
      host: config.host,
      user: config.user,
      password: config.password,
      secure: true,
      secureOptions: { rejectUnauthorized: true },
    });

    logger.info("Успешное подключение к FTP");

    const baseRemoteDir = "recordings";
    const DATE_DIR_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

    // Сначала получаем список папок в recordings
    let dateDirs: string[] = [];
    try {
      await Promise.race([
        client.cd(baseRemoteDir),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout changing directory")), OPERATION_TIMEOUT),
        ),
      ]);

      const dirList = (await Promise.race([
        client.list(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout listing directory")), OPERATION_TIMEOUT),
        ),
      ])) as { name: string; isDirectory?: boolean }[];

      dateDirs = dirList
        .filter((f) => (f.isDirectory ?? true) && DATE_DIR_PATTERN.test(f.name))
        .map((f) => f.name);

      const dateStr = options?.dateStr;
      const syncFromDate = options?.syncFromDate;

      if (dateStr) {
        dateDirs = dateDirs.filter((d) => d === dateStr);
      } else if (syncFromDate) {
        const todayStr = new Date().toISOString().slice(0, 10);
        dateDirs = dateDirs.filter((d) => d >= syncFromDate && d <= todayStr).sort();
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 7);
        const fromStr = fromDate.toISOString().slice(0, 10);
        const todayStr = today.toISOString().slice(0, 10);
        dateDirs = dateDirs.filter((d) => d >= fromStr && d <= todayStr).sort();
      }

      logger.info("Найдены папки с записями", { dateDirs });
    } catch (e) {
      const errorMsg = `Не удалось прочитать ${baseRemoteDir}: ${e instanceof Error ? e.message : String(e)}`;
      result.errors.push(errorMsg);
      logger.error("Ошибка чтения директории FTP", {
        path: baseRemoteDir,
        error: e instanceof Error ? e.message : String(e),
      });
      return result;
    }

    for (const dateDir of dateDirs) {
      let files: { name: string }[] = [];

      try {
        await Promise.race([
          client.cd(dateDir),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout changing directory")), OPERATION_TIMEOUT),
          ),
        ]);

        const list = (await Promise.race([
          client.list(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout listing directory")), OPERATION_TIMEOUT),
          ),
        ])) as { name: string }[];

        files = list.filter((f: { name: string }) => f.name.endsWith(".mp3"));
      } catch (e) {
        const remotePath = `${baseRemoteDir}/${dateDir}`;
        const errorMsg = `Не удалось прочитать ${remotePath}: ${e instanceof Error ? e.message : String(e)}`;
        result.errors.push(errorMsg);
        logger.error("Ошибка чтения директории FTP", {
          path: remotePath,
          error: e instanceof Error ? e.message : String(e),
        });
        continue;
      }

      // Ограничиваем одновременную обработку файлов до 5
      const fileLimit = pLimit(5);

      await Promise.all(
        files.map((file) =>
          fileLimit(async () => {
            // Создаем отдельный FTP клиент для каждой задачи
            const taskClient = new Client(OPERATION_TIMEOUT);
            taskClient.ftp.verbose = false;

            try {
              await taskClient.access({
                host: config.host,
                user: config.user,
                password: config.password,
                secure: true,
                secureOptions: { rejectUnauthorized: true },
              });

              // Переходим в директорию с файлами (полный путь от корня FTP)
              await taskClient.cd(`${baseRemoteDir}/${dateDir}`);

              // Обрабатываем файл
              await processFile(taskClient, file, dateDir, workspaceId, options, result);
            } catch (error) {
              const errorMsg = `${dateDir}/${file.name}: ${error instanceof Error ? error.message : String(error)}`;
              result.errors.push(errorMsg);
              logger.error("Ошибка обработки файла", {
                filename: `${dateDir}/${file.name}`,
                error: error instanceof Error ? error.message : String(error),
              });
            } finally {
              taskClient.close();
            }
          }),
        ),
      );

      // Возврат в recordings для следующей итерации
      await client.cd("..");
    }
  } finally {
    client.close();
    logger.info("FTP соединение закрыто");
  }

  logger.info("Синхронизация завершена", {
    downloaded: result.downloaded,
    skipped: result.skipped,
    s3Uploaded: result.s3Uploaded,
    errors: result.errors.length,
  });

  return result;
}
