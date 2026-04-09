/**
 * Types related to users operations
 */

// Evaluation template slugs (defined locally to avoid dependency on @calls/shared)
const EVALUATION_TEMPLATE_SLUGS = ["sales", "support", "general"] as const;

export type EvaluationTemplateSlug = (typeof EVALUATION_TEMPLATE_SLUGS)[number];

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
  reportManagedUserIds?: string[];
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
  evaluationTemplateSlug?: EvaluationTemplateSlug | null;
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
