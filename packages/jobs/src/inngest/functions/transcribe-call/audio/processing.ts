/**
 * Обработка аудио с помощью ffmpeg
 */

import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { createReadStream, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createLogger } from "../../../../logger";

const logger = createLogger("audio-processing");

const FFMPEG_TIMEOUT_MS = 120_000;

/**
 * Создает уникальный временный каталог для обработки аудио
 */
function createTempDir(): string {
  const tempDir = join(tmpdir(), `transcribe-${randomUUID()}`);
  try {
    mkdirSync(tempDir, { recursive: true });
    return tempDir;
  } catch (error) {
    logger.error("Ошибка создания временного каталога", {
      tempDir,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `Не удалось создать временный каталог: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Удаляет временный каталог и все его содержимое
 */
function cleanupTempDir(tempDir: string): void {
  try {
    // Используем rmSync с recursive для удаления директории и содержимого
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Игнорируем ошибки при очистке
  }
}

/**
 * Извлекает аудио сегмент из полного аудио буфера с помощью ffmpeg
 */
export async function extractAudioSegment(
  audioBuffer: ArrayBuffer,
  startTime: number,
  endTime: number,
): Promise<ArrayBuffer> {
  const duration = endTime - startTime;

  if (duration <= 0) {
    logger.warn("Некорректная длительность сегмента", { startTime, endTime, duration });
    // Возвращаем пустой буфер вместо полного аудио
    return new ArrayBuffer(0);
  }

  // Создаем уникальный временный каталог
  const tempDir = createTempDir();
  const inputPath = join(tempDir, "input.wav");
  const outputPath = join(tempDir, "output.wav");

  try {
    // Записываем входной буфер во временный файл
    writeFileSync(inputPath, new Uint8Array(audioBuffer));

    // Запускаем ffmpeg с таймаутом
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i",
        inputPath,
        "-ss",
        startTime.toFixed(3),
        "-t",
        duration.toFixed(3),
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        "-f",
        "wav",
        "-y",
        outputPath,
      ]);

      const timer = setTimeout(() => {
        ffmpeg.kill("SIGKILL");
        reject(new Error(`таймаут ffmpeg через ${FFMPEG_TIMEOUT_MS} мс`));
      }, FFMPEG_TIMEOUT_MS);

      let stderr = "";
      ffmpeg.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg завершился с кодом ${code}: ${stderr}`));
        }
      });

      ffmpeg.on("error", (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    // Читаем результат
    const resultBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = createReadStream(outputPath);
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });

    logger.info("Аудио сегмент успешно извлечен", {
      startTime,
      endTime,
      duration,
      inputSize: audioBuffer.byteLength,
      outputSize: resultBuffer.length,
    });

    return new Uint8Array(resultBuffer).buffer;
  } catch (error) {
    logger.error("Ошибка извлечения аудио сегмента", {
      startTime,
      endTime,
      duration,
      error: error instanceof Error ? error.message : String(error),
    });

    // НЕ возвращаем полный буфер - это приведет к неверной транскрипции
    throw new Error(
      `Не удалось извлечь аудио сегмент ${startTime}-${endTime}с: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    // Очистка временного каталога
    cleanupTempDir(tempDir);
  }
}
