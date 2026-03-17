/**
 * Типы для настроек приглашения (pending settings).
 * Соответствуют PendingUserSettings из packages/db.
 */

export interface InvitationNotificationSettings {
  email?: {
    dailyReport?: boolean;
    weeklyReport?: boolean;
    monthlyReport?: boolean;
  };
  telegram?: {
    dailyReport?: boolean;
    managerReport?: boolean;
    weeklyReport?: boolean;
    monthlyReport?: boolean;
    skipWeekends?: boolean;
  };
  max?: {
    chatId?: string;
    dailyReport?: boolean;
    managerReport?: boolean;
  };
}

export interface InvitationReportSettings {
  includeCallSummaries?: boolean;
  detailed?: boolean;
  includeAvgValue?: boolean;
  includeAvgRating?: boolean;
  managedUserIds?: string[];
}

export interface InvitationKpiSettings {
  baseSalary?: number;
  targetBonus?: number;
  targetTalkTimeMinutes?: number;
}

export interface InvitationFilterSettings {
  excludeAnsweringMachine?: boolean;
  minDuration?: number;
  minReplicas?: number;
}

export interface InvitationEvaluationSettings {
  templateSlug?: string;
  customInstructions?: string;
}

export interface InvitationSettingsPayload {
  notificationSettings?: InvitationNotificationSettings;
  reportSettings?: InvitationReportSettings;
  kpiSettings?: InvitationKpiSettings;
  filterSettings?: InvitationFilterSettings;
  evaluationSettings?: InvitationEvaluationSettings;
}
