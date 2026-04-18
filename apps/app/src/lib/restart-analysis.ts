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

  // Проверяем отмену перед началом работы
  if (signal?.aborted) {
    throw new Error("Опрос отменён по AbortSignal");
  }

  try {
    await transcribe({ call_id: String(callId) });
  } catch (transcribeError) {
    console.error("Transcription failed:", transcribeError);
    throw new Error("Не удалось выполнить транскрипцию");
  }

  // Опрос с ожиданием завершения через Promise
  const maxAttempts = 5;
  const baseDelay = 300; // 300ms начальная задержка

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Проверяем отмену
    if (signal?.aborted) {
      throw new Error("Опрос отменён по AbortSignal");
    }

    const delay = baseDelay * 2 ** attempt; // 300ms, 600ms, 1200ms, 2400ms, 4800ms
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, delay);

      const onAbort = () => {
        clearTimeout(timeoutId);
        signal?.removeEventListener("abort", onAbort);
        reject(new Error("Опрос отменён по AbortSignal"));
      };

      signal?.addEventListener("abort", onAbort);
    });

    // Повторная проверка после задержки
    if (signal?.aborted) {
      throw new Error("Опрос отменён по AbortSignal");
    }

    try {
      await loadData();
      // Успешно загрузили данные - завершаем опрос
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Продолжаем к следующей попытке
    }
  }

  // Все попытки исчерпаны - пробрасываем последнюю ошибку
  throw lastError || new Error(`Опрос завершился неудачно после ${maxAttempts} попыток`);
}
