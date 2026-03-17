/** Типы для формы настроек отчётов (camelCase) */

export interface ReportSettingsForm {
  email: string;
  emailDailyReport: boolean;
  emailWeeklyReport: boolean;
  emailMonthlyReport: boolean;
  telegramChatId: string;
  telegramDailyReport: boolean;
  telegramWeeklyReport: boolean;
  telegramMonthlyReport: boolean;
  telegramSkipWeekends: boolean;
  reportIncludeCallSummaries: boolean;
  reportDetailed: boolean;
  reportIncludeAvgValue: boolean;
  reportIncludeAvgRating: boolean;
  filterExcludeAnsweringMachine: boolean;
  filterMinDuration: string;
  filterMinReplicas: string;
  kpiBaseSalary: string;
  kpiTargetBonus: string;
  kpiTargetTalkTimeMinutes: string;
  reportDailyTime: string;
  reportWeeklyDay: string;
  reportWeeklyTime: string;
  reportMonthlyDay: string;
  reportMonthlyTime: string;
  reportManagedUserIds: string[];
  maxChatId: string;
  maxDailyReport: boolean;
  maxManagerReport: boolean;
}

export interface ReportSettingsUserOption {
  id: string;
  email: string;
  givenName: string;
  familyName: string;
}

/** Сериализация полей формы в snake_case для API users.update */
export function serializeReportSettingsForApi(
  form: ReportSettingsForm,
): Record<string, unknown> {
  return {
    email: form.email.trim() || undefined,
    email_daily_report: form.emailDailyReport,
    email_weekly_report: form.emailWeeklyReport,
    email_monthly_report: form.emailMonthlyReport,
    telegramChatId: form.telegramChatId.trim() || undefined,
    telegram_daily_report: form.telegramDailyReport,
    telegram_weekly_report: form.telegramWeeklyReport,
    telegram_monthly_report: form.telegramMonthlyReport,
    telegram_skip_weekends: form.telegramSkipWeekends,
    report_include_call_summaries: form.reportIncludeCallSummaries,
    report_detailed: form.reportDetailed,
    report_include_avg_value: form.reportIncludeAvgValue,
    report_include_avg_rating: form.reportIncludeAvgRating,
    filter_exclude_answering_machine: form.filterExcludeAnsweringMachine,
    filter_min_duration: parseInt(form.filterMinDuration, 10) || 0,
    filter_min_replicas: parseInt(form.filterMinReplicas, 10) || 0,
    kpi_base_salary: parseInt(form.kpiBaseSalary, 10) || 0,
    kpi_target_bonus: parseInt(form.kpiTargetBonus, 10) || 0,
    kpi_target_talk_time_minutes:
      parseInt(form.kpiTargetTalkTimeMinutes, 10) || 0,
    report_managed_user_ids: JSON.stringify(form.reportManagedUserIds ?? []),
  };
}

/** Сериализация MAX-настроек для API users.updateMaxSettings */
export function serializeMaxSettingsForApi(form: ReportSettingsForm) {
  return {
    max_chat_id: form.maxChatId?.trim() || null,
    max_daily_report: form.maxDailyReport,
    max_manager_report: form.maxManagerReport,
  };
}

/** Сериализация prompts для API settings.updatePrompts */
export function serializePromptsForApi(form: ReportSettingsForm) {
  return {
    report_daily_time: {
      value: form.reportDailyTime || "18:00",
      description: "Время ежедневного отчёта (ЧЧ:ММ)",
    },
    report_weekly_day: {
      value: form.reportWeeklyDay || "fri",
      description: "День недели еженедельного",
    },
    report_weekly_time: {
      value: form.reportWeeklyTime || "18:10",
      description: "Время еженедельного отчёта",
    },
    report_monthly_day: {
      value: form.reportMonthlyDay || "last",
      description: "День месяца (1-28 или last)",
    },
    report_monthly_time: {
      value: form.reportMonthlyTime || "18:20",
      description: "Время ежемесячного отчёта",
    },
  };
}
