export const DEEPSEEK_MODELS: Record<string, { name: string; max_tokens: number }> = {
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
export const REPORT_SETTINGS_KEYS = [
  "report_daily_time",
  "report_weekly_day",
  "report_weekly_time",
  "report_monthly_day",
  "report_monthly_time",
  "report_skip_weekends",
] as const;

/** Маппинг camelCase → snake_case для ключей prompts */
export const REPORT_PROMPTS_CAMEL_TO_SNAKE: Record<string, (typeof REPORT_SETTINGS_KEYS)[number]> =
  {
    reportDailyTime: "report_daily_time",
    reportWeeklyDay: "report_weekly_day",
    reportWeeklyTime: "report_weekly_time",
    reportMonthlyDay: "report_monthly_day",
    reportMonthlyTime: "report_monthly_time",
    reportSkipWeekends: "report_skip_weekends",
  };

/** Маппинг snake_case → camelCase для ключей prompts */
export const REPORT_PROMPTS_SNAKE_TO_CAMEL: Record<(typeof REPORT_SETTINGS_KEYS)[number], string> =
  {
    report_daily_time: "reportDailyTime",
    report_weekly_day: "reportWeeklyDay",
    report_weekly_time: "reportWeeklyTime",
    report_monthly_day: "reportMonthlyDay",
    report_monthly_time: "reportMonthlyTime",
    report_skip_weekends: "reportSkipWeekends",
  };
