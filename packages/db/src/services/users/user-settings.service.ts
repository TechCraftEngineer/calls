/**
 * User settings service - handles settings operations
 */

import { userWorkspaceSettingsRepository } from "../../repositories/user-workspace-settings.repository";
import type { SystemRepository } from "../../repositories/system.repository";
import type { NotificationSettings } from "../../schema";
import type { UserUpdateData, UserForEdit } from "./types";
import { buildUpsertData, hasAnySettingsUpdate, parseUserUpdateData } from "./settings-helpers";

export class UserSettingsService {
  constructor(private systemRepository: SystemRepository) {}

  async getUserForEdit(
    userId: string,
    workspaceId: string,
    user: {
      email: string | null;
      givenName: string | null;
      familyName: string | null;
      internalExtensions: string | null;
      mobilePhones: string | null;
      telegramChatId: string | null;
    },
    role: string,
    settings: {
      notificationSettings?: unknown;
      filterSettings?: unknown;
      reportSettings?: unknown;
      kpiSettings?: unknown;
      evaluationSettings?: unknown;
    } | null,
  ): Promise<UserForEdit> {
    const ns = settings?.notificationSettings as
      | {
          email?: { dailyReport?: boolean; weeklyReport?: boolean; monthlyReport?: boolean };
          telegram?: {
            dailyReport?: boolean;
            managerReport?: boolean;
            weeklyReport?: boolean;
            monthlyReport?: boolean;
            skipWeekends?: boolean;
          };
          max?: { chatId?: string; dailyReport?: boolean; managerReport?: boolean };
        }
      | undefined;

    const fs = settings?.filterSettings as
      | { excludeAnsweringMachine?: boolean; minDuration?: number; minReplicas?: number }
      | undefined;

    const rs = settings?.reportSettings as { managedUserIds?: string[] } | undefined;

    const ks = settings?.kpiSettings as
      | { baseSalary?: number; targetBonus?: number; targetTalkTimeMinutes?: number }
      | undefined;

    const es = settings?.evaluationSettings as
      | { templateSlug?: "sales" | "support" | "general"; customInstructions?: string }
      | null
      | undefined;

    const managedIds = rs?.managedUserIds;
    const reportManagedUserIds = Array.isArray(managedIds) ? managedIds : [];

    return {
      email: (user.email ?? "") as string,
      givenName: user.givenName ?? "",
      familyName: user.familyName ?? "",
      role,
      internalExtensions: user.internalExtensions ?? "",
      mobilePhones: user.mobilePhones ?? "",
      telegramChatId: user.telegramChatId ?? "",
      telegramDailyReport: ns?.telegram?.dailyReport ?? false,
      telegramManagerReport: ns?.telegram?.managerReport ?? false,
      maxChatId: ns?.max?.chatId ?? "",
      maxDailyReport: ns?.max?.dailyReport ?? false,
      maxManagerReport: ns?.max?.managerReport ?? false,
      filterExcludeAnsweringMachine: fs?.excludeAnsweringMachine ?? false,
      filterMinDuration: fs?.minDuration ?? 0,
      filterMinReplicas: fs?.minReplicas ?? 0,
      emailDailyReport: ns?.email?.dailyReport ?? false,
      emailWeeklyReport: ns?.email?.weeklyReport ?? false,
      emailMonthlyReport: ns?.email?.monthlyReport ?? false,
      telegramWeeklyReport: ns?.telegram?.weeklyReport ?? false,
      telegramMonthlyReport: ns?.telegram?.monthlyReport ?? false,
      telegramSkipWeekends: ns?.telegram?.skipWeekends ?? false,
      reportManagedUserIds,
      kpiBaseSalary: ks?.baseSalary ?? 0,
      kpiTargetBonus: ks?.targetBonus ?? 0,
      kpiTargetTalkTimeMinutes: ks?.targetTalkTimeMinutes ?? 0,
      evaluationTemplateSlug: es?.templateSlug ?? null,
      evaluationCustomInstructions: es?.customInstructions ?? null,
    };
  }

  async updateUserFilters(
    userId: string,
    workspaceId: string,
    filterExcludeAnsweringMachine: boolean,
    filterMinDuration: number,
    filterMinReplicas: number,
  ): Promise<boolean> {
    return userWorkspaceSettingsRepository.upsert(userId, workspaceId, {
      filterSettings: {
        excludeAnsweringMachine: filterExcludeAnsweringMachine,
        minDuration: filterMinDuration,
        minReplicas: filterMinReplicas,
      },
    });
  }

  async updateUserReportKpiSettings(
    userId: string,
    workspaceId: string,
    data: UserUpdateData,
  ): Promise<boolean> {
    const parsed = parseUserUpdateData(data);

    if (!hasAnySettingsUpdate(parsed)) {
      return true;
    }

    const upsertData = buildUpsertData(parsed);
    const result = await userWorkspaceSettingsRepository.upsert(userId, workspaceId, upsertData);

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `User ${userId} report/KPI settings updated`,
        "admin",
      );
    }

    return result;
  }

  async updateUserTelegramSettings(
    userId: string,
    workspaceId: string,
    telegramDailyReport: boolean,
    telegramManagerReport: boolean,
  ): Promise<boolean> {
    return userWorkspaceSettingsRepository.upsert(userId, workspaceId, {
      notificationSettings: {
        telegram: {
          dailyReport: telegramDailyReport,
          managerReport: telegramManagerReport,
        },
      } as Partial<NotificationSettings>,
    });
  }
}
