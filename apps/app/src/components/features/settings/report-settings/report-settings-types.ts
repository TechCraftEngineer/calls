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
  reportDailyTime: string;
  reportWeeklyDay: string;
  reportWeeklyTime: string;
  reportMonthlyDay: string;
  reportMonthlyTime: string;
  reportManagedUserIds: string[];
  maxChatId: string;
  maxDailyReport: boolean;
  maxManagerReport: boolean;
  kpiBaseSalary: string;
  kpiTargetBonus: string;
  kpiTargetTalkTimeMinutes: string;
  reportDetailed: boolean;
  reportIncludeCallSummaries: boolean;
  reportIncludeAvgRating: boolean;
  reportIncludeKpi: boolean;
}

export interface ReportSettingsUserOption {
  id: string;
  email: string;
  givenName: string;
  familyName: string;
}
