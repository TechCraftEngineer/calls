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
