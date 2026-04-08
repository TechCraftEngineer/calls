import type { User } from "@/lib/auth";

/** Пользователь из API users.list (workspace members) */
export interface WorkspaceMemberUser {
  id: string;
  memberId: string;
  userId: string;
  role: string;
  email: string;
  name: string;
  givenName: string | null;
  familyName: string | null;
  internalExtensions: string | null;
  mobilePhones: string | null;
  createdAt: string | null;
  telegramChatId: string | null;
  evaluationTemplateSlug: "sales" | "support" | "general" | null;
  // Опциональные поля отчётов и настроек (camelCase и snake_case для совместимости с API)
  telegramDailyReport?: boolean;
  telegramManagerReport?: boolean;
  maxChatId?: string | null;
  maxDailyReport?: boolean;
  maxManagerReport?: boolean;
  filterExcludeAnsweringMachine?: boolean;
  filterMinDuration?: number;
  filterMinReplicas?: number;
  emailDailyReport?: boolean;
  emailWeeklyReport?: boolean;
  emailMonthlyReport?: boolean;
  telegramWeeklyReport?: boolean;
  telegramMonthlyReport?: boolean;
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
  evaluationCustomInstructions?: string | null;
}

// Расширенный тип пользователя с полями управления
export interface ManagedUser extends Omit<User, "id" | "email" | "createdAt"> {
  id: string;
  email: string;
  userId?: string;
  role?: "owner" | "admin" | "member";
  internalExtensions?: string;
  mobilePhones?: string;
  createdAt?: string;
  givenName?: string;
  familyName?: string;
  telegramChatId?: string;
  telegramDailyReport?: boolean;
  telegramManagerReport?: boolean;
  maxChatId?: string;
  maxDailyReport?: boolean;
  maxManagerReport?: boolean;
  filterExcludeAnsweringMachine?: boolean;
  filterMinDuration?: number;
  filterMinReplicas?: number;
  emailDailyReport?: boolean;
  emailWeeklyReport?: boolean;
  emailMonthlyReport?: boolean;
  telegramWeeklyReport?: boolean;
  telegramMonthlyReport?: boolean;
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
  evaluationTemplateSlug?: string | null;
  evaluationCustomInstructions?: string | null;
}

// Форма создания пользователя
export interface AddUserForm {
  email: string;
  password: string;
  givenName: string;
  familyName: string;
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
  kpiBaseSalary: number;
  kpiTargetBonus: number;
  kpiTargetTalkTimeMinutes: number;
  evaluationTemplateSlug: "sales" | "support" | "general" | null;
  evaluationCustomInstructions: string | null;
}

// Форма редактирования пользователя (без пароля)
export type EditUserForm = Omit<AddUserForm, "password">;

// CSS классы для модальных окон
export const modalOverlayClasses =
  "fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]";
export const modalBoxClasses =
  "bg-white rounded-xl p-6 max-w-[440px] w-full max-h-[90vh] overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.2)]";
export const formFieldWrap = "mb-3";
export const formLabel = "block mb-1 text-[13px] font-semibold";
export const formInput = "w-full py-2 px-3 border border-[#ddd] rounded-md box-border";
