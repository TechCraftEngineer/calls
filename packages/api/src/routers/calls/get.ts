import { filesService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { translateCallType, translateNotAnalyzableReason } from "./translations";

const uuidV7Schema = z
  .string()
  .uuid()
  .refine((uuid) => uuid.split("-")[2]?.startsWith("7"), {
    message: "Требуется UUID v7",
  });
const uuidV7WithPrefixSchema = z
  .string()
  .regex(/^ws_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "Неверный формат ID звонка с префиксом",
  });
const callIdSchema = z.union([uuidV7Schema, uuidV7WithPrefixSchema]);

export const get = workspaceProcedure
  .input(z.object({ call_id: callIdSchema }))
  .handler(async ({ input, context }) => {
    const call = await context.callsService.getCall(input.call_id);
    if (!call) {
      throw new ORPCError("NOT_FOUND", { message: "Звонок не найден" });
    }
    if (call.workspaceId !== context.workspaceId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому звонку",
      });
    }
    const [transcript, evaluation] = await Promise.all([
      context.callsService.getTranscriptByCallId(input.call_id),
      context.callsService.getEvaluation(input.call_id),
    ]);

    // Размер и длительность: из связанного файла
    let sizeBytes: number | null | undefined;
    let durationSeconds: number | null | undefined;
    if (call.fileId) {
      try {
        const file = await filesService.getFileById(call.fileId);
        sizeBytes = file?.sizeBytes ?? undefined;
        durationSeconds = file?.durationSeconds ?? undefined;
      } catch (error) {
        console.warn(`File not found for call ${input.call_id}:`, error);
      }
    }

    const operatorName =
      (transcript?.metadata &&
      typeof transcript.metadata === "object" &&
      "operatorName" in transcript.metadata &&
      typeof transcript.metadata.operatorName === "string"
        ? transcript.metadata.operatorName
        : null) ??
      call.name ??
      null;
    const managerName = operatorName ?? call.name ?? null;

    // Извлекаем маппинг спикеров из metadata для замены SPEAKER_00/SPEAKER_01
    // mapping теперь сохраняется на верхнем уровне metadata (добавлен в serializeMetadata)
    const speakerMapping =
      transcript?.metadata &&
      typeof transcript.metadata === "object" &&
      "mapping" in transcript.metadata &&
      typeof transcript.metadata.mapping === "object"
        ? (transcript.metadata.mapping as Record<string, string>)
        : // Поддержка старого формата: diarization.mapping
          transcript?.metadata &&
            typeof transcript.metadata === "object" &&
            "diarization" in transcript.metadata &&
            transcript.metadata.diarization &&
            typeof transcript.metadata.diarization === "object" &&
            "mapping" in transcript.metadata.diarization &&
            typeof transcript.metadata.diarization.mapping === "object"
          ? (transcript.metadata.diarization.mapping as Record<string, string>)
          : undefined;

    const { filename: _filename, ...publicCall } = call;

    return {
      call: {
        ...publicCall,
        timestamp: call.timestamp instanceof Date ? call.timestamp.toISOString() : call.timestamp,
        duration: (durationSeconds === undefined ? null : durationSeconds) as number | null,
        sizeBytes: (sizeBytes === undefined ? null : sizeBytes) as number | null,
        managerName,
        operatorName,
      },
      transcript: transcript
        ? {
            ...transcript,
            callType: translateCallType(transcript.callType),
            speakerMapping,
          }
        : null,
      evaluation: evaluation
        ? {
            ...evaluation,
            notAnalyzableReason: translateNotAnalyzableReason(evaluation.notAnalyzableReason),
          }
        : null,
    };
  });
