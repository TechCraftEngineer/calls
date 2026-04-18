/**
 * Утилита перезапуска анализа звонка (транскрипция + оценка).
 * Транскрипция автоматически запускает оценку по завершении.
 * Используется на странице детали звонка и в модальном окне.
 */

export async function restartCallAnalysis(params: {
  callId: string | number;
  transcribe: (input: { call_id: string }) => Promise<void>;
  loadData: () => Promise<void>;
  signal?: AbortSignal;
}): Promise<void> {
  const { callId, transcribe, loadData, signal } = params;

  try {
    await transcribe({ call_id: String(callId) });
  } catch (transcribeError) {
    console.error("Transcription failed:", transcribeError);
    throw new Error("Не удалось выполнить транскрипцию");
  }

  // Polling с ожиданием завершения через Promise
  const maxAttempts = 5;
  const baseDelay = 300; // 300ms начальная задержка

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Проверяем отмену
    if (signal?.aborted) {
      throw new Error("Polling отменен по AbortSignal");
    }

    const delay = baseDelay * 2 ** attempt; // 300ms, 600ms, 1200ms, 2400ms, 4800ms
    await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, delay);
      signal?.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        reject(new Error("Polling отменен по AbortSignal"));
      }, { once: true });
    });

    // Повторная проверка после задержки
    if (signal?.aborted) {
      throw new Error("Polling отменен по AbortSignal");
    }

    try {
      await loadData();
      // Успешно загрузили данные - завершаем polling
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Продолжаем к следующей попытке
    }
  }

  // Все попытки исчерпаны - пробрасываем последнюю ошибку
  throw lastError || new Error(`Polling завершился неудачно после ${maxAttempts} попыток`);
}
