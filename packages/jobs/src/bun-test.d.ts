declare module "bun:test" {
  // Минимальные типы для прохождения `tsc` в пакете.
  // Bun сам используется рантаймом для выполнения тестов, но TypeScript здесь
  // не находит объявления модулей по умолчанию.
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  type Expectation = {
    toEqual: (value: unknown) => void;
  };

  export const expect: {
    (value: unknown): Expectation;
    objectContaining: (
      value: Record<string, unknown>,
    ) => Record<string, unknown>;
  };
}
