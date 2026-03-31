/**
 * Evaluation operations for calls
 */

import { eq } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";
import type { EvaluationData } from "../../types/calls.types";

export const callsEvaluations = {
  async getEvaluation(callId: string): Promise<schema.CallEvaluation | null> {
    const result = await db
      .select()
      .from(schema.callEvaluations)
      .where(eq(schema.callEvaluations.callId, callId))
      .limit(1);
    return result[0] ?? null;
  },

  async addEvaluation(data: EvaluationData): Promise<string> {
    // Используем транзакцию для атомарности операции
    return await db.transaction(async (tx) => {
      // Проверяем существование звонка
      const call = await tx
        .select()
        .from(schema.calls)
        .where(eq(schema.calls.id, data.callId))
        .limit(1);

      if (!call[0]) {
        throw new Error(`Call with id ${data.callId} not found`);
      }

      // Вставляем или обновляем оценку
      const result = await tx
        .insert(schema.callEvaluations)
        .values({
          callId: data.callId,
          valueScore: data.valueScore ?? null,
          valueExplanation: data.valueExplanation ?? null,
          managerScore: data.managerScore ?? null,
          managerFeedback: data.managerFeedback ?? null,
          managerBreakdown: data.managerBreakdown 
            ? (typeof data.managerBreakdown === 'string' 
                ? JSON.parse(data.managerBreakdown) 
                : data.managerBreakdown)
            : null,
          managerRecommendations: data.managerRecommendations ?? null,
          isQualityAnalyzable: data.isQualityAnalyzable,
          notAnalyzableReason: data.notAnalyzableReason ?? null,
        })
        .onConflictDoUpdate({
          target: schema.callEvaluations.callId,
          set: {
            valueScore: data.valueScore ?? null,
            valueExplanation: data.valueExplanation ?? null,
            managerScore: data.managerScore ?? null,
            managerFeedback: data.managerFeedback ?? null,
            managerBreakdown: data.managerBreakdown 
              ? (typeof data.managerBreakdown === 'string' 
                  ? JSON.parse(data.managerBreakdown) 
                  : data.managerBreakdown)
              : null,
            managerRecommendations: data.managerRecommendations ?? null,
            isQualityAnalyzable: data.isQualityAnalyzable,
            notAnalyzableReason: data.notAnalyzableReason ?? null,
          },
        })
        .returning({ id: schema.callEvaluations.id });

      return result[0]?.id ?? "";
    });
  },
};
