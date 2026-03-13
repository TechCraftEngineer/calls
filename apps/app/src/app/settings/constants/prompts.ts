export const PROMPT_KEYS = {
  quality: "Оценка качества работы",
  speaker_analysis_incoming: "Анализ спикеров (Вх)",
  speaker_analysis_outgoing: "Анализ спикеров (Исх)",
  value_outgoing: "Оценка ценности (Исх)",
  value_incoming: "Оценка ценности (Вх)",
  manager_recommendations: "Рекомендации менеджеру",
  customer_name_extraction: "Определение имени заказчика",
} as const;

export const INTEGRATION_KEYS = {
  megafon_ftp_host: "Host",
  megafon_ftp_user: "User",
  megafon_ftp_password: "Password",
  telegram_bot_token: "Token",
  max_bot_token: "Token",
} as const;
