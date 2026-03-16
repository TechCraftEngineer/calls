import { filesService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";

export const get = workspaceProcedure
  .input(z.object({ call_id: z.string() }))
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
    const transcript = await context.callsService.getTranscriptByCallId(
      input.call_id,
    );
    const evaluation = await context.callsService.getEvaluation(input.call_id);

    // Размер: из call или из связанного файла
    let sizeBytes =
      (call as { sizeBytes?: number }).sizeBytes ??
      (call as { size_bytes?: number }).size_bytes;
    if (sizeBytes == null && (call as { fileId?: string }).fileId) {
      try {
        const file = await filesService.getFileById(
          (call as { fileId: string }).fileId,
        );
        sizeBytes = file?.sizeBytes ?? undefined;
      } catch (error) {
        // Если файл не найден, оставляем sizeBytes как undefined
        console.warn(`File not found for call ${input.call_id}:`, error);
      }
    }

    // Маппинг для фронтенда (snake_case)
    const operatorName = (call as { name?: string }).name ?? null;
    const callForFrontend = {
      ...call,
      size_bytes: sizeBytes ?? undefined,
      customer_name:
        (call as { customerName?: string }).customerName ??
        (call as { customer_name?: string }).customer_name ??
        undefined,
      manager_name: operatorName,
      operator_name: operatorName,
    };

    // Маппинг transcript для фронтенда (snake_case)
    const transcriptForFrontend = transcript
      ? {
          ...transcript,
          raw_text:
            (transcript as { rawText?: string }).rawText ??
            (transcript as { raw_text?: string }).raw_text,
          call_type:
            (transcript as { callType?: string }).callType ??
            (transcript as { call_type?: string }).call_type ??
            "",
          call_topic:
            (transcript as { callTopic?: string }).callTopic ??
            (transcript as { call_topic?: string }).call_topic ??
            "",
          summary: (transcript as { summary?: string }).summary ?? "",
        }
      : null;

    // Маппинг evaluation для фронтенда (snake_case)
    const evaluationForFrontend = evaluation
      ? {
          ...evaluation,
          value_score:
            (evaluation as { valueScore?: number }).valueScore ??
            (evaluation as { value_score?: number }).value_score,
          value_explanation:
            (evaluation as { valueExplanation?: string }).valueExplanation ??
            (evaluation as { value_explanation?: string }).value_explanation,
          manager_recommendations:
            (evaluation as { managerRecommendations?: string[] | null }).managerRecommendations ??
            (evaluation as { manager_recommendations?: string[] | null }).manager_recommendations,
        }
      : null;

    return {
      call: callForFrontend,
      transcript: transcriptForFrontend,
      evaluation: evaluationForFrontend,
    };
  });
