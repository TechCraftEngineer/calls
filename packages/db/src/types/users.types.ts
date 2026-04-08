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
  maxChatId?: string | null;
  maxDailyReport?: boolean;
  maxManagerReport?: boolean;
  emailDailyReport?: boolean;
  emailWeeklyReport?: boolean;
  emailMonthlyReport?: boolean;
  reportManagedUserIds?: string[] | string;
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
  evaluationTemplateSlug?: "sales" | "support" | "general" | null;
  evaluationCustomInstructions?: string | null;
}

export interface CreateUserData {
  email: string;
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
