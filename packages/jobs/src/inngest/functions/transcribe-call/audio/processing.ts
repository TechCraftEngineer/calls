/**
 * Обработка аудио с помощью ffmpeg
 */

import { spawn } from "child_process";
import { createReadStream, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createLogger } from "../../../../logger";

const logger = createLogger("audio-processing");

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
    return audioBuffer;
  }

  const tempDir = tmpdir();
  const inputPath = join(tempDir, `extract_input_${Date.now()}.wav`);
  const outputPath = join(tempDir, `extract_output_${Date.now()}.wav`);

  try {
    // Записываем входной буфер во временный файл
    writeFileSync(inputPath, new Uint8Array(audioBuffer));

    // Запускаем ffmpeg
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

      let stderr = "";
      ffmpeg.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on("error", (err: Error) => {
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
    logger.error("Ошибка извлечения аудио сегмента, возвращаем полный буфер", {
      startTime,
      endTime,
      duration,
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback: возвращаем полный буфер при ошибке
    return audioBuffer;
  } finally {
    // Очистка временных файлов
    try {
      unlinkSync(inputPath);
    } catch {
      /* ignore */
    }
    try {
      unlinkSync(outputPath);
    } catch {
      /* ignore */
    }
  }
}
