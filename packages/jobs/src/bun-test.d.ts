declare module "bun:test" {
  // Минимальные типы для прохождения `tsc` в пакете.
  // Bun сам используется рантаймом для выполнения тестов, но TypeScript здесь
  // не находит объявления модулей по умолчанию.
  export function describe(name: string, fn: () => unknown): void;
  export function it(name: string, fn: () => unknown | Promise<unknown>): void;
  type Expectation = {
    toEqual: (value: unknown) => unknown;
  };

  export const expect: {
    (value: unknown): Expectation;
    objectContaining: (value: Record<string, unknown>) => unknown;
  };
}
