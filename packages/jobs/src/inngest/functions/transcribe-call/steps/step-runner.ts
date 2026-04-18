/**
 * Интерфейс для Inngest step с методами run и waitForEvent
 * Типизированные методы для сохранения статической типизации.
 * fn может быть синхронной или асинхронной функцией.
 */
export interface StepRunner {
  run<T>(id: string, fn: () => T | Promise<T>): Promise<T>;
  waitForEvent<T>(
    id: string,
    options: { event: string; timeout: string; if: string },
  ): Promise<T | null>;
}

/**
 * Интерфейс для Inngest step с методами run, waitForEvent и sleep
 */

export interface StepRunnerWithSleep extends StepRunner {
  sleep(id: string, duration: string): Promise<void>;
}
