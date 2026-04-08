/**
 * Types for users service
 */

import type { User, WorkspaceMember } from "../../schema";

export type { User, WorkspaceMember };

export interface CreateUserData {
  email: string;
  givenName?: string | null;
  familyName?: string | null;
  passwordHash: string;
  internalExtensions?: string | null;
  mobilePhones?: string | null;
}

export interface UpdateUserData {
  givenName?: string | null;
  familyName?: string | null;
  internalExtensions?: string | null;
  mobilePhones?: string | null;
}

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
  maxChatId?: string | null;
  maxDailyReport?: boolean;
  maxManagerReport?: boolean;
  reportManagedUserIds?: string[] | string;
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
  evaluationTemplateSlug?: "sales" | "support" | "general" | null;
  evaluationCustomInstructions?: string | null;
}

export interface UserForEdit {
  email: string;
  givenName: string;
  familyName: string;
  role: string;
  internalExtensions: string;
  mobilePhones: string;
  telegramChatId: string;
  telegramDailyReport: boolean;
  telegramManagerReport: boolean;
  maxChatId: string;
  maxDailyReport: boolean;
  maxManagerReport: boolean;
  filterExcludeAnsweringMachine: boolean;
  filterMinDuration: number;
  filterMinReplicas: number;
  emailDailyReport: boolean;
  emailWeeklyReport: boolean;
  emailMonthlyReport: boolean;
  telegramWeeklyReport: boolean;
  telegramMonthlyReport: boolean;
  telegramSkipWeekends: boolean;
  reportManagedUserIds: string[];
  kpiBaseSalary: number;
  kpiTargetBonus: number;
  kpiTargetTalkTimeMinutes: number;
  evaluationTemplateSlug: string | null;
  evaluationCustomInstructions: string | null;
}
