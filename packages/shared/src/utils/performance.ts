/** Измеряет время выполнения функции */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
  const startTime = Date.now();
  const result = await fn();
  const timeMs = Date.now() - startTime;
  return { result, timeMs };
}

/** Измеряет время выполнения синхронной функции */
export function measureTimeSync<T>(fn: () => T): { result: T; timeMs: number } {
  const startTime = Date.now();
  const result = fn();
  const timeMs = Date.now() - startTime;
  return { result, timeMs };
}

/** Простая функция sleep для задержек */
export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
