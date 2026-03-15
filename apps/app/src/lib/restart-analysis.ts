/**
 * Утилита перезапуска анализа звонка (транскрипция + оценка).
 * Используется на странице детали звонка и в модальном окне.
 */

import { api } from "@/lib/api";

export async function restartCallAnalysis(params: {
  callId: string | number;
  loadData: () => Promise<void>;
}): Promise<void> {
  const { callId, loadData } = params;

  try {
    await api.calls.transcribe({ call_id: callId });
  } catch (transcribeError) {
    console.error("Transcription failed:", transcribeError);
    throw new Error("Не удалось выполнить транскрипцию");
  }

  try {
    await api.calls.evaluate({ call_id: callId });
  } catch (evalError) {
    console.warn("Evaluation failed, but transcription succeeded:", evalError);
    // Не прерываем выполнение, если оценка не удалась
  }

  await loadData();
}
