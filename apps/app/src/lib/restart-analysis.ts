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

  // Запускаем фоновый polling без блокировки возврата функции
  // Это позволяет UI быстро обновиться, а данные обновляются в фоне
  const maxAttempts = 5;
  const baseDelay = 300; // 300ms начальная задержка

  void (async () => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const delay = baseDelay * 2 ** attempt; // 300ms, 600ms, 1200ms, 2400ms, 4800ms
      await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        await loadData();
      } catch {
        // Игнорируем ошибки при фоновом обновлении
      }
    }
  })();
}
