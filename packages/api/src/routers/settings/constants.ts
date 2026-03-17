export const DEEPSEEK_MODELS: Record<
  string,
  { name: string; max_tokens: number }
> = {
  "deepseek-chat": { name: "DeepSeek Chat", max_tokens: 8192 },
  "deepseek-coder": { name: "DeepSeek Coder", max_tokens: 8192 },
};

export const SENSITIVE_KEYS = [
  "telegram_bot_token",
  "max_bot_token",
  "ftp_password",
  "password",
  "token",
  "secret",
  "key",
];

/** Ключи настроек отчётов (время, день недели и т.д.) — хранятся в workspace_settings */
export const PROMPT_KEYS = [
  "report_daily_time",
  "report_weekly_day",
  "report_weekly_time",
  "report_monthly_day",
  "report_monthly_time",
] as const;
