/**
 * Руссификация значений полей callType и notAnalyzableReason
 */

export const CALL_TYPE_TRANSLATIONS: Record<string, string> = {
  autoanswerer: "Автоответчик",
  auto_answerer: "Автоответчик",
  "auto-answerer": "Автоответчик",
  voicemail: "Голосовая почта",
  voice_mail: "Голосовая почта",
  sales: "Продажа",
  support: "Поддержка",
  consultation: "Консультация",
  inquiry: "Запрос",
  complaint: "Жалоба",
  technical: "Технический",
  general: "Общий",
  unknown: "Неизвестно",
};

export const NOT_ANALYZABLE_REASON_TRANSLATIONS: Record<string, string> = {
  autoanswerer: "Автоответчик или голосовое меню",
  auto_answerer: "Автоответчик или голосовое меню",
  "auto-answerer": "Автоответчик или голосовое меню",
  voicemail: "Голосовая почта",
  voice_mail: "Голосовая почта",
  robot: "Робот",
  no_dialog: "Отсутствует содержательный диалог",
  "no-dialog": "Отсутствует содержательный диалог",
  noDialog: "Отсутствует содержательный диалог",
  too_short: "Слишком короткий звонок",
  tooShort: "Слишком короткий звонок",
  unclear: "Неразборчивая запись",
  technical_error: "Техническая ошибка",
  technicalError: "Техническая ошибка",
};

/**
 * Переводит значение callType на русский язык
 */
export function translateCallType(value: string | null | undefined): string | null {
  if (!value) return null;
  return CALL_TYPE_TRANSLATIONS[value] ?? value;
}

/**
 * Переводит значение notAnalyzableReason на русский язык
 */
export function translateNotAnalyzableReason(value: string | null | undefined): string | null {
  if (!value) return null;
  return NOT_ANALYZABLE_REASON_TRANSLATIONS[value] ?? value;
}
