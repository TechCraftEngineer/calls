/**
 * Types related to users operations
 */

export interface UserUpdateData {
  filterExcludeAnsweringMachine?: boolean;
  filterMinDuration?: number;
  filterMinReplicas?: number;
  telegramDailyReport?: boolean;
  telegramManagerReport?: boolean;
  telegramWeeklyReport?: boolean;
  telegramMonthlyReport?: boolean;
  telegramSkipWeekends?: boolean;
  emailDailyReport?: boolean;
  emailWeeklyReport?: boolean;
  emailMonthlyReport?: boolean;
  reportIncludeCallSummaries?: boolean;
  reportDetailed?: boolean;
  reportIncludeAvgValue?: boolean;
  reportIncludeAvgRating?: boolean;
  reportManagedUserIds?: string | null;
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
}

export interface CreateUserData {
  username: string;
  password: string;
  givenName: string;
  familyName?: string;
  internalExtensions?: string | null;
  mobilePhones?: string | null;
}

export interface UpdateUserData {
  givenName?: string;
  familyName?: string;
  internalExtensions?: string | null;
  mobilePhones?: string | null;
}
