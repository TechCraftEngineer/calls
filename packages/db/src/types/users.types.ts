/**
 * Types related to users operations
 */

import type { EVALUATION_TEMPLATE_SLUGS } from "@calls/shared";

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
