/**
 * Получение и валидация данных звонка из БД
 */

import { callsService } from "@calls/db";
import type { z } from "zod";
import type { Call } from "../schemas";
import { CallSchema } from "../schemas";

export async function fetchCall(callId: string): Promise<Call> {
  const c = await callsService.getCall(callId);
  if (!c) {
    throw new Error(`Звонок не найден: ${callId}`);
  }

  const validationResult = CallSchema.safeParse(c);
  if (!validationResult.success) {
    const errorDetails = validationResult.error.issues
      .map((issue: z.core.$ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Call validation failed: ${errorDetails}`);
  }

  return validationResult.data;
}
