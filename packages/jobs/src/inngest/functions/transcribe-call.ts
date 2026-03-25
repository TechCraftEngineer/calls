/**
 * Inngest функция: транскрибация звонка по callId.
 * Получает аудио из S3, запускает ASR pipeline, сохраняет транскрипт.
 */

import {
  callsService,
  filesService,
  pbxRepository,
  workspaceIntegrationsRepository,
  workspacesService,
} from "@calls/db";
import { deleteObjectFromS3, getDownloadUrlForAsr } from "@calls/lib";
import type { PreprocessingResult } from "~/asr/audio/audio-preprocessing";
import { getAudioDurationFromBuffer } from "~/asr/audio/get-audio-duration";
import { identifySpeakersWithLlm } from "~/asr/llm/identify-speakers";
import { prepareAudioForAsr } from "~/asr/pipeline/prepare-audio";
import { runTranscriptionPipelineFromAsrAudio } from "~/asr/pipeline/run-transcription-pipeline";
import { createLogger } from "../../logger";
import { evaluateRequested, inngest, transcribeRequested } from "../client";

const logger = createLogger("transcribe-call");

function buildCompanyContext(workspace: {
  name?: string | null;
  description?: string | null;
}): string | undefined {
  const parts: string[] = [];
  const companyName = workspace.name?.trim();
  const companyDescription = workspace.description?.trim();

  if (companyName) {
    parts.push(`Название компании: ${companyName}`);
  }
  if (companyDescription) {
    parts.push(`Описание компании: ${companyDescription}`);
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

type ValidatedPcm16Wav =
  | {
      valid: true;
      fmt: {
        audioFormat: number;
        numChannels: number;
        sampleRate: number;
        bitsPerSample: number;
      };
    }
  | { valid: false; reason: string };

function validatePcm16WavBuffer(buffer: Buffer): ValidatedPcm16Wav {
  if (buffer.length < 12) {
    return { valid: false, reason: "Buffer is too small for RIFF/WAVE" };
  }

  const riff = buffer.toString("ascii", 0, 4);
  const wave = buffer.toString("ascii", 8, 12);
  if (riff !== "RIFF" || wave !== "WAVE") {
    return {
      valid: false,
      reason: `Invalid magic bytes (riff=${riff}, wave=${wave})`,
    };
  }

  // WAV structure:
  // RIFF header (12 bytes) -> sequence of chunks (4-char id + 4-byte size) until EOF.
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    offset += 8;

    if (chunkSize > buffer.length - offset) {
      return {
        valid: false,
        reason: `Chunk ${chunkId} size (${chunkSize}) exceeds buffer`,
      };
    }

    if (chunkId === "fmt ") {
      // PCM fmt chunk must be at least 16 bytes.
      if (chunkSize < 16 || offset + 16 > buffer.length) {
        return {
          valid: false,
          reason: `Invalid fmt chunk (size=${chunkSize})`,
        };
      }

      const audioFormat = buffer.readUInt16LE(offset);
      const numChannels = buffer.readUInt16LE(offset + 2);
      const sampleRate = buffer.readUInt32LE(offset + 4);
      const bitsPerSample = buffer.readUInt16LE(offset + 14);

      if (audioFormat !== 1) {
        return {
          valid: false,
          reason: `Expected PCM (audioFormat=1), got ${audioFormat}`,
        };
      }

      if (bitsPerSample !== 16) {
        return {
          valid: false,
          reason: `Expected 16-bit samples (bitsPerSample=16), got ${bitsPerSample}`,
        };
      }

      return {
        valid: true,
        fmt: { audioFormat, numChannels, sampleRate, bitsPerSample },
      };
    }

    // Chunks are padded to even byte boundaries.
    offset += chunkSize;
    if (chunkSize % 2 === 1) offset += 1;
  }

  return { valid: false, reason: "Missing fmt chunk" };
}

export const transcribeCallFn = inngest.createFunction(
  {
    id: "transcribe-call",
    name: "Транскрибация звонка (ASR + LLM нормализация)",
    retries: 2,
    concurrency: {
      limit: 1,
      key: "event.data.callId",
    },
    triggers: [transcribeRequested],
  },
  async ({ event, step }) => {
    const { callId } = event.data;
    await step.run("validate/input", async () => {
      if (!callId) {
        throw new Error("callId обязателен");
      }
    });

    const call = await step.run("db/calls:get", async () => {
      const c = await callsService.getCall(callId);
      if (!c) throw new Error(`Звонок не найден: ${callId}`);
      if (!c.fileId)
        throw new Error(`У звонка ${callId} нет привязанного файла`);
      return c;
    });

    const fileId = call.fileId;
    const audioUrl = await step.run("audio/url:resolve", async () => {
      if (!fileId) throw new Error(`У звонка ${callId} нет привязанного файла`);
      const file = await filesService.getFileById(fileId);
      if (!file) throw new Error(`Файл не найден: ${fileId}`);
      const url = await getDownloadUrlForAsr(file.storageKey);
      // Диагностика: проверка доступности URL (Yandex SpeechKit получает 403 при недоступном URL)
      const headRes = await fetch(url, { method: "HEAD" });
      if (!headRes.ok) {
        logger.warn(
          "Pre-signed URL недоступен — проверьте права S3 ключа и bucket",
          {
            callId,
            storageKey: file.storageKey,
            status: headRes.status,
            statusText: headRes.statusText,
          },
        );
      }
      return url;
    });

    const workspace = await step.run("db/workspaces:get", async () => {
      const ws = await workspacesService.getById(call.workspaceId);
      if (!ws) {
        logger.warn("Workspace not found for call transcription", {
          workspaceId: call.workspaceId,
          callId,
        });
        throw new Error(`Workspace not found: ${call.workspaceId}`);
      }
      return ws;
    });

    const managerNameFromPbx = await step.run(
      "pbx/manager:resolve",
      async () => {
        try {
          const pbxIntegration =
            await workspaceIntegrationsRepository.getByWorkspaceAndType(
              call.workspaceId,
              "megapbx",
            );

          if (!pbxIntegration?.enabled) {
            logger.info("PBX integration not enabled for workspace", {
              callId,
              workspaceId: call.workspaceId,
            });
            return null;
          }

          const rawProvider =
            typeof pbxIntegration.config === "object" &&
            pbxIntegration.config !== null &&
            "provider" in pbxIntegration.config
              ? pbxIntegration.config.provider
              : undefined;
          const integrationProvider =
            typeof rawProvider === "string" ? rawProvider.trim() : "megapbx";
          if (!integrationProvider) {
            logger.warn("PBX integration provider is missing", {
              callId,
              workspaceId: call.workspaceId,
            });
            return null;
          }

          const pbxNumbers = await pbxRepository.listNumbers(
            call.workspaceId,
            integrationProvider,
          );
          const activePbxNumbers = pbxNumbers.filter(
            (number) => number.isActive,
          );
          const callPbxNumberId = call.pbxNumberId;
          const normalizedInternalNumber = call.internalNumber?.trim() || null;

          const matchedById = callPbxNumberId
            ? activePbxNumbers.find((number) => number.id === callPbxNumberId)
            : undefined;
          const matchedByInternalNumber =
            !matchedById && normalizedInternalNumber
              ? activePbxNumbers.find(
                  (number) =>
                    (number.extension?.trim() || null) ===
                    normalizedInternalNumber,
                )
              : undefined;

          const matchedNumber = matchedById ?? matchedByInternalNumber;
          const managerName =
            matchedNumber?.label?.trim() ||
            matchedNumber?.extension?.trim() ||
            matchedNumber?.phoneNumber?.trim() ||
            null;

          if (managerName) {
            logger.info("Менеджер определён из pbx_numbers", {
              callId,
              resolutionStrategy: matchedById
                ? "pbx_number_id"
                : "internal_number",
            });
          }

          return managerName;
        } catch (error) {
          logger.warn("Не удалось определить менеджера из pbx_numbers", {
            callId,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      },
    );

    const result = await step.run("asr/transcribe", async () => {
      logger.info("Запуск транскрибации", {
        callId,
        audioUrlLength: audioUrl.length,
      });

      // Вариант 2: улучшенное аудио сохраняем один раз и используем для ASR.
      // Temp-объекты в S3 не создаём.
      let preprocessingResult: PreprocessingResult | null = null;

      let asrAudioUrl = audioUrl;
      let yandexUseLinear16PcmForYandex = false;

      const prepareAndMaybeUseEnhancedAudio = async () => {
        const prepared = await prepareAudioForAsr(audioUrl, {
          audioPreprocessing: undefined,
        });
        preprocessingResult = prepared.preprocessingResult;

        const enhancedBuffer = preprocessingResult?.enhancedAudioBuffer;
        const enhancedFilename = preprocessingResult?.enhancedAudioFilename;

        if (
          preprocessingResult?.wasProcessed &&
          enhancedBuffer &&
          enhancedBuffer.length > 0 &&
          enhancedFilename
        ) {
          const wavValidation = validatePcm16WavBuffer(enhancedBuffer);
          if (!wavValidation.valid) {
            logger.error(
              "enhanced-аудио не является корректным 16-bit PCM WAV",
              {
                callId,
                enhancedFilename,
                bufferLength: enhancedBuffer.length,
                reason: wavValidation.reason,
              },
            );
            throw new Error(
              `Invalid enhanced WAV buffer: ${wavValidation.reason}`,
            );
          }

          let enhancedDurationSeconds: number | null = null;
          try {
            const duration = await getAudioDurationFromBuffer(enhancedBuffer);
            if (typeof duration === "number" && duration > 0) {
              enhancedDurationSeconds = duration;
            }
          } catch (durationErr) {
            logger.warn("Не удалось определить длительность enhanced-аудио", {
              callId,
              error:
                durationErr instanceof Error
                  ? durationErr.message
                  : String(durationErr),
            });
          }

          const enhancedFilenameLower = enhancedFilename.toLowerCase();
          const normalizedFilename = enhancedFilenameLower.endsWith(".wav")
            ? enhancedFilename
            : enhancedFilenameLower.includes(".")
              ? enhancedFilename.replace(/\.[^.]+$/, ".wav")
              : `${enhancedFilename}.wav`;

          let uploadedEnhancedFile: Awaited<
            ReturnType<typeof filesService.uploadFile>
          > | null = null;

          try {
            uploadedEnhancedFile = await filesService.uploadFile(
              call.workspaceId,
              {
                originalName: normalizedFilename,
                buffer: enhancedBuffer,
                mimeType: "audio/wav",
                fileType: "call_recording",
                source: "asr-preprocessing",
                durationSeconds: enhancedDurationSeconds,
              },
            );

            // Важно: обновление `calls.enhanced_audio_file_id` может не
            // пройти, но ASR при этом должен идти по уже загруженному WAV.
            asrAudioUrl = await getDownloadUrlForAsr(
              uploadedEnhancedFile.storageKey,
            );
            yandexUseLinear16PcmForYandex = true;
          } catch (error) {
            logger.warn("Не удалось сохранить улучшенное аудио", {
              callId,
              error: error instanceof Error ? error.message : String(error),
            });

            if (uploadedEnhancedFile) {
              try {
                const deleted = await filesService.deleteFile(
                  uploadedEnhancedFile.storageKey,
                );
                if (deleted) {
                  logger.info("Загруженный enhanced-аудиофайл удалён", {
                    callId,
                    enhancedFileId: uploadedEnhancedFile.id,
                  });
                } else {
                  logger.warn(
                    "Не удалось удалить загруженный enhanced-аудиофайл",
                    {
                      callId,
                      enhancedFileId: uploadedEnhancedFile.id,
                      storageKey: uploadedEnhancedFile.storageKey,
                    },
                  );
                }
              } catch (deleteError) {
                logger.warn("Ошибка при удалении orphaned файла", {
                  callId,
                  enhancedFileId: uploadedEnhancedFile.id,
                  deleteError:
                    deleteError instanceof Error
                      ? deleteError.message
                      : String(deleteError),
                });
              }
            }
          }

          if (uploadedEnhancedFile) {
            try {
              await callsService.updateEnhancedAudio(
                callId,
                uploadedEnhancedFile.id,
              );
            } catch (error) {
              logger.warn("Не удалось обновить enhanced-аудио в calls", {
                callId,
                enhancedFileId: uploadedEnhancedFile.id,
                error: error instanceof Error ? error.message : String(error),
              });
              // Не бросаем ошибку: ASR уже использует `asrAudioUrl`.
              // Если ссылку сохранить не удалось, загруженный файл может стать orphaned.
              try {
                try {
                  await deleteObjectFromS3(uploadedEnhancedFile.storageKey);
                  logger.info(
                    "S3 enhanced-аудиофайл удалён после ошибки updateEnhancedAudio",
                    {
                      callId,
                      enhancedFileId: uploadedEnhancedFile.id,
                      storageKey: uploadedEnhancedFile.storageKey,
                    },
                  );
                } catch (s3DeleteError) {
                  logger.warn(
                    "Не удалось удалить orphaned S3 объект после ошибки updateEnhancedAudio",
                    {
                      callId,
                      enhancedFileId: uploadedEnhancedFile.id,
                      storageKey: uploadedEnhancedFile.storageKey,
                      deleteError:
                        s3DeleteError instanceof Error
                          ? s3DeleteError.message
                          : String(s3DeleteError),
                    },
                  );
                }

                const deleted = await filesService.deleteFile(
                  uploadedEnhancedFile.storageKey,
                );

                if (deleted) {
                  logger.info(
                    "Загруженный enhanced-аудиофайл удалён после ошибки updateEnhancedAudio",
                    {
                      callId,
                      enhancedFileId: uploadedEnhancedFile.id,
                    },
                  );
                } else {
                  logger.warn(
                    "Не удалось удалить загруженный enhanced-аудиофайл после ошибки updateEnhancedAudio",
                    {
                      callId,
                      enhancedFileId: uploadedEnhancedFile.id,
                      storageKey: uploadedEnhancedFile.storageKey,
                    },
                  );
                }
              } catch (deleteError) {
                logger.warn(
                  "Ошибка при удалении orphaned файла после updateEnhancedAudio",
                  {
                    callId,
                    enhancedFileId: uploadedEnhancedFile.id,
                    deleteError:
                      deleteError instanceof Error
                        ? deleteError.message
                        : String(deleteError),
                  },
                );
              }
            }
          }
        }
      };

      if (call.enhancedAudioFileId) {
        const enhancedFile = await filesService.getFileById(
          call.enhancedAudioFileId,
        );

        if (enhancedFile) {
          try {
            asrAudioUrl = await getDownloadUrlForAsr(enhancedFile.storageKey);
            yandexUseLinear16PcmForYandex = true;
          } catch (error) {
            logger.error("Не удалось получить URL enhanced-аудио", {
              callId,
              enhancedAudioFileId: call.enhancedAudioFileId,
              error: error instanceof Error ? error.message : String(error),
            });

            // Фолбэк: используем ту же механику, что и prepareAndMaybeUseEnhancedAudio
            await prepareAndMaybeUseEnhancedAudio();
          }
        } else {
          logger.warn("enhancedAudioFileId задан, но файл не найден", {
            callId,
            enhancedAudioFileId: call.enhancedAudioFileId,
          });
          await prepareAndMaybeUseEnhancedAudio();
        }
      } else {
        await prepareAndMaybeUseEnhancedAudio();
      }

      return runTranscriptionPipelineFromAsrAudio(
        asrAudioUrl,
        preprocessingResult,
        {
          companyContext: buildCompanyContext(workspace),
        },
        yandexUseLinear16PcmForYandex,
      );
    });

    const identifyResult = await step.run("llm/diarize", async () => {
      const fallbackManagerName = call.name?.trim() || null;
      return identifySpeakersWithLlm(result.normalizedText, {
        direction: call.direction,
        managerName: managerNameFromPbx ?? fallbackManagerName,
        workspaceId: call.workspaceId,
      });
    });
    const { text: finalText, customerName, operatorName } = identifyResult;

    await step.run("persist/transcript:upsert", async () => {
      const normalizedCallType = result.callType?.trim() || null;
      // Безопасная сериализация метаданных
      let serializedMetadata: Record<string, unknown> = {};
      try {
        if (result.metadata && typeof result.metadata === "object") {
          serializedMetadata = JSON.parse(JSON.stringify(result.metadata));
        }
        if (operatorName != null && operatorName !== "") {
          serializedMetadata.operatorName = operatorName;
        }
        if (
          identifyResult.metadata &&
          typeof identifyResult.metadata === "object"
        ) {
          serializedMetadata.diarization = identifyResult.metadata;
        }
      } catch (error) {
        logger.warn("Ошибка сериализации метаданных", {
          callId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      await callsService.upsertTranscript({
        callId,
        text: finalText,
        rawText: result.rawText,
        confidence: result.metadata.confidence ?? null,
        metadata: serializedMetadata,
        summary: result.summary,
        sentiment: result.sentiment,
        title: result.title,
        callType: normalizedCallType,
        callTopic: result.callTopic,
      });

      if (
        typeof result.metadata.durationInSeconds === "number" &&
        result.metadata.durationInSeconds > 0
      ) {
        await callsService.updateCallDuration(
          callId,
          result.metadata.durationInSeconds,
        );
      }

      if (customerName) {
        await callsService.updateCustomerName(callId, customerName);
      }

      logger.info("Транскрипт сохранён", {
        callId,
        processingTimeMs: result.metadata.processingTimeMs,
        asrSource: result.metadata.asrSource,
      });
    });

    await step.sendEvent(
      "event/call.evaluate.requested",
      evaluateRequested.create({ callId }),
    );

    return {
      callId,
      processingTimeMs: result.metadata.processingTimeMs,
      asrSource: result.metadata.asrSource,
      textLength: finalText.length,
      customerName: customerName ?? null,
    };
  },
);
