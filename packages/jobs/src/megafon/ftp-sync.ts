/**
 * Загрузка записей с Megafon PBX FTP.
 * Структура на FTP: recordings/{YYYY-MM-DD}/{filename}.mp3
 */

import { Writable } from "node:stream";
import { env } from "@calls/config";
import { callsService, filesService, workspacesService } from "@calls/db";
import { validateFtpCredentials } from "@calls/shared";
import { Client } from "basic-ftp";
import { createLogger } from "../logger";
import { parseMegafonFilename } from "./parse-filename";

const logger = createLogger("megafon-ftp-sync");

export interface MegafonFtpConfig {
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

function validateFtpConfig(config: MegafonFtpConfig): string[] {
  const validation = validateFtpCredentials(
    config.host,
    config.user,
    config.password,
  );
  return validation.errors;
}

export async function syncMegafonFtp(
  config: MegafonFtpConfig,
  dateStr?: string,
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

  // Устанавливаем таймауты для отдельных операций
  const OPERATION_TIMEOUT = 30_000; // 30 секунд для отдельных операций

  try {
    logger.info("Подключение к FTP", { host: config.host, user: config.user });

    await client.access({
      host: config.host,
      user: config.user,
      password: config.password,
      secure: false,
    });

    logger.info("Успешное подключение к FTP");

    const defaultWs = await workspacesService.getBySlug("default");
    if (!defaultWs) {
      throw new Error("Рабочее пространство 'default' не найдено");
    }
    const workspaceId = defaultWs.id;

    const baseRemoteDir = "recordings";
    const remoteDirs: string[] = dateStr
      ? [dateStr]
      : [0, 1].map((i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().slice(0, 10);
        });

    for (const dateDir of remoteDirs) {
      const remotePath = `${baseRemoteDir}/${dateDir}`;
      let files: { name: string }[] = [];

      try {
        await Promise.race([
          client.cd(remotePath),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Timeout changing directory")),
              OPERATION_TIMEOUT,
            ),
          ),
        ]);

        const list = (await Promise.race([
          client.list(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Timeout listing directory")),
              OPERATION_TIMEOUT,
            ),
          ),
        ])) as { name: string }[];

        files = list.filter((f: { name: string }) => f.name.endsWith(".mp3"));
      } catch (e) {
        const errorMsg = `Не удалось прочитать ${remotePath}: ${e instanceof Error ? e.message : String(e)}`;
        result.errors.push(errorMsg);
        logger.error("Ошибка чтения директории FTP", {
          path: remotePath,
          error: e instanceof Error ? e.message : String(e),
        });
        continue;
      }

      for (const file of files) {
        const relativePath = `${dateDir}/${file.name}`;

        const existing = await callsService.getCallByFilename(
          relativePath,
          workspaceId,
        );
        if (existing) {
          result.skipped++;
          continue;
        }

        const parsed = parseMegafonFilename(relativePath);
        if (!parsed) {
          const errorMsg = `Не удалось разобрать имя: ${relativePath}`;
          result.errors.push(errorMsg);
          logger.warn("Ошибка парсинга имени файла", {
            filename: relativePath,
          });
          continue;
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
              setTimeout(
                () => reject(new Error("Timeout downloading file")),
                OPERATION_TIMEOUT,
              ),
            ),
          ]);

          // Валидация размера файла
          const MIN_FILE_SIZE = 1024; // 1KB
          const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

          if (downloadBuffer.length < MIN_FILE_SIZE) {
            result.errors.push(
              `${relativePath}: Файл слишком маленький (${downloadBuffer.length} bytes)`,
            );
            logger.warn("Файл слишком маленький", {
              filename: relativePath,
              size: downloadBuffer.length,
            });
            continue;
          }

          if (downloadBuffer.length > MAX_FILE_SIZE) {
            result.errors.push(
              `${relativePath}: Файл слишком большой (${downloadBuffer.length} bytes)`,
            );
            logger.warn("Файл слишком большой", {
              filename: relativePath,
              size: downloadBuffer.length,
            });
            continue;
          }

          // Загрузка файла в S3 через FilesService
          let fileId: string | null = null;
          let storageKey: string | null = null;
          try {
            const uploadResult = await filesService.uploadCallRecording(
              workspaceId,
              relativePath,
              downloadBuffer,
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
              error:
                s3Error instanceof Error ? s3Error.message : String(s3Error),
            });
            // Прерываем обработку файла, так как без S3 транскрибация невозможна
            continue;
          }

          const callId = await callsService.createCall({
            workspaceId,
            filename: relativePath,
            number: parsed.externalNumber,
            internalNumber: parsed.internalNumber,
            timestamp: parsed.timestamp,
            direction:
              parsed.direction === "incoming" ? "Входящий" : "Исходящий",
            source: parsed.internalNumber,
            name: parsed.internalNumber,
            sizeBytes: downloadBuffer.length,
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
