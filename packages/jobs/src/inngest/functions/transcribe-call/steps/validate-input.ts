/**
 * Валидация входных данных события
 */

import type { TranscribeCallEvent } from "../schemas";
import { TranscribeCallEventSchema } from "../schemas";

export function validateInput(callId: string): TranscribeCallEvent {
  const validationResult = TranscribeCallEventSchema.safeParse({ callId });
  if (!validationResult.success) {
    const errorDetails = validationResult.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Validation failed: ${errorDetails}`);
  }
  return validationResult.data;
}
