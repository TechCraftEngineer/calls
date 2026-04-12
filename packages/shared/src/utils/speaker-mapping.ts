/**
 * Утилиты для работы с маппингом спикеров
 */

/**
 * Заменяет SPEAKER_XX на "оператор" или "клиент" на основе маппинга
 *
 * @param text - Исходный текст с SPEAKER_XX
 * @param mapping - Объект с соответствием { SPEAKER_00: "operator", SPEAKER_01: "client" }
 * @returns Текст с замененными названиями ролей
 *
 * @example
 * ```ts
 * const text = "SPEAKER_00: Здравствуйте\nSPEAKER_01: Алло";
 * const mapping = { SPEAKER_00: "operator", SPEAKER_01: "client" };
 * const result = replaceSpeakersWithRoles(text, mapping);
 * // "Оператор: Здравствуйте\nКлиент: Алло"
 * ```
 */
export function replaceSpeakersWithRoles(
  text: string,
  mapping: Record<string, "operator" | "client" | string>,
): string {
  if (!text || !mapping || Object.keys(mapping).length === 0) {
    return text;
  }

  let result = text;
  for (const [speakerId, role] of Object.entries(mapping)) {
    const roleLabel = role === "operator" ? "Оператор" : role === "client" ? "Клиент" : speakerId;
    // Заменяем все вхождения SPEAKER_XX: или SPEAKER_XX (без двоеточия)
    const regex = new RegExp(`${speakerId}(:|\\b)`, "g");
    result = result.replace(regex, `${roleLabel}$1`);
  }

  return result;
}
