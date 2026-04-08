/**
 * Russian pluralization helper
 * 1 звонок, 2 звонка, 5 звонков
 */
export function pluralize(n: number, one: string, few: string, many: string): string {
  // Нормализация n: приведение к числу, обработка NaN, удаление дробной части и отрицательных значений
  let normalized = Number(n);
  if (Number.isNaN(normalized)) normalized = 0;
  normalized = Math.abs(Math.floor(normalized));

  const mod10 = normalized % 10;
  const mod100 = normalized % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
