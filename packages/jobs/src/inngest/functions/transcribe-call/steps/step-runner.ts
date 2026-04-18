/**
 * Интерфейс для Inngest step с методами run и waitForEvent
 * Использует unknown для совместимости с внутренними типами Inngest
 */
export interface StepRunner {
  run<T>(id: string, fn: () => Promise<T>): Promise<unknown>;
  waitForEvent<T>(
    id: string,
    options: { event: string; timeout: string; if: string },
  ): Promise<unknown>;
}

/**
 * Интерфейс для Inngest step с методами run, waitForEvent и sleep
 */

export interface StepRunnerWithSleep extends StepRunner {
  sleep(id: string, duration: string): Promise<void>;
}
