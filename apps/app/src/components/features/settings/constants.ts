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
  ftp_enabled: "Включено",
  ftp_host: "Host",
  ftp_user: "User",
  ftp_password: "Password",
  telegram_bot_token: "Token",
  max_bot_token: "Token",
} as const;
