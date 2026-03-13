/**
 * Загрузка записей с Megafon PBX FTP.
 * Структура на FTP: recordings/{YYYY-MM-DD}/{filename}.mp3
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { createLogger } from "@calls/api/logger";
import { callsService, workspacesService } from "@calls/db";
import { Client } from "basic-ftp";
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
}

function getRecordsDir(): string {
  const isDocker =
    process.env.DEPLOYMENT_ENV === "docker" || existsSync("/.dockerenv");
  if (isDocker) return "/app/records";
  return join(process.cwd(), "records");
}

function validateFtpConfig(config: MegafonFtpConfig): string[] {
  const errors: string[] = [];

  if (!config.host || config.host.trim().length === 0) {
    errors.push("FTP host не может быть пустым");
  }

  if (!config.user || config.user.trim().length === 0) {
    errors.push("FTP user не может быть пустым");
  }

  if (!config.password || config.password.length === 0) {
    errors.push("FTP password не может быть пустым");
  }

  // Проверка формата хоста
  if (config.host && !/^[\w.-]+\.[\w.-]+$/.test(config.host)) {
    errors.push("Некорректный формат FTP хоста");
  }

  return errors;
}

export async function syncMegafonFtp(
  config: MegafonFtpConfig,
  dateStr?: string,
): Promise<SyncResult> {
  const result: SyncResult = { downloaded: 0, skipped: 0, errors: [] };
  const recordsDir = getRecordsDir();

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
    const workspaceId = defaultWs?.id ?? 1;

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
        const localPath = join(recordsDir, dateDir, file.name);

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
          const localDir = dirname(localPath);
          if (!existsSync(localDir)) {
            mkdirSync(localDir, { recursive: true });
          }

          await Promise.race([
            client.downloadTo(localPath, file.name),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Timeout downloading file")),
                OPERATION_TIMEOUT,
              ),
            ),
          ]);
          const stat = statSync(localPath);

          // Валидация размера файла
          const MIN_FILE_SIZE = 1024; // 1KB
          const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

          if (stat.size < MIN_FILE_SIZE) {
            result.errors.push(
              `${relativePath}: Файл слишком маленький (${stat.size} bytes)`,
            );
            logger.warn("Файл слишком маленький", {
              filename: relativePath,
              size: stat.size,
            });
            continue;
          }

          if (stat.size > MAX_FILE_SIZE) {
            result.errors.push(
              `${relativePath}: Файл слишком большой (${stat.size} bytes)`,
            );
            logger.warn("Файл слишком большой", {
              filename: relativePath,
              size: stat.size,
            });
            continue;
          }

          await callsService.createCall({
            workspaceId,
            filename: relativePath,
            number: parsed.externalNumber,
            internal_number: parsed.internalNumber,
            timestamp: parsed.timestamp,
            direction:
              parsed.direction === "incoming" ? "Входящий" : "Исходящий",
            source: parsed.internalNumber,
            name: parsed.internalNumber,
            size_bytes: stat.size,
          });

          result.downloaded++;
          logger.info("Файл успешно загружен", {
            filename: relativePath,
            size: stat.size,
            direction: parsed.direction,
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
    errors: result.errors.length,
  });

  return result;
}
