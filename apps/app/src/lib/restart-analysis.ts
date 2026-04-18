/**
 * Утилита перезапуска анализа звонка (транскрипция + оценка).
 * Транскрипция автоматически запускает оценку по завершении.
 * Используется на странице детали звонка и в модальном окне.
 */

export async function restartCallAnalysis(params: {
  callId: string | number;
  transcribe: (input: { call_id: string }) => Promise<void>;
  loadData: () => Promise<void>;
}): Promise<void> {
  const { callId, transcribe, loadData } = params;

  try {
    await transcribe({ call_id: String(callId) });
  } catch (transcribeError) {
    console.error("Transcription failed:", transcribeError);
    throw new Error("Не удалось выполнить транскрипцию");
  }

  // Даем Inngest время обновить статус в БД перед refetch
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await loadData();
}
