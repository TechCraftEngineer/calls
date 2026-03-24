export interface Prompt {
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
  meta?: { passwordSet?: boolean };
  /** Локальная ошибка валидации (не с сервера) */
  error?: string;
}

export interface FtpSettings {
  enabled: boolean;
  host: string;
  user: string;
  password: string;
  passwordSet: boolean;
  syncFromDate: string;
  excludePhoneNumbers: string;
}

export interface IntegrationsSettings {
  telegramBotToken: string;
  telegramUsesDefault: boolean;
  maxBotToken: string;
}

export interface MegaPbxSettings {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  apiKeySet: boolean;
  syncFromDate: string;
  excludePhoneNumbers: string;
  webhookSecret: string;
  webhookSecretSet: boolean;
  ftpHost: string;
  ftpUser: string;
  ftpPassword: string;
  ftpPasswordSet: boolean;
  syncEmployees: boolean;
  syncNumbers: boolean;
  syncCalls: boolean;
  syncRecordings: boolean;
  webhooksEnabled: boolean;
}

export interface FtpConnectionStatus {
  configured: boolean;
  success: boolean | null;
  message: string | null;
}

export interface PbxCandidateUser {
  id: string;
  email: string;
  name: string;
  givenName?: string | null;
  familyName?: string | null;
  internalExtensions?: string | null;
}

export interface PbxCandidateInvitation {
  id: string;
  email: string;
  role: string;
}

export interface PbxLinkInfo {
  id: string;
  targetType: string;
  targetExternalId: string;
  userId: string | null;
  invitationId: string | null;
  linkSource: string;
}

export interface PbxEmployeeItem {
  externalId: string;
  displayName: string;
  extension: string | null;
  email: string | null;
  isActive: boolean;
  linkedUser: { id: string; email: string; name: string } | null;
  linkedInvitation: { id: string; email: string; role: string } | null;
  link: PbxLinkInfo | null;
  candidates: PbxCandidateUser[];
  invitationCandidates: PbxCandidateInvitation[];
}

export interface PbxNumberItem {
  externalId: string;
  phoneNumber: string;
  extension: string | null;
  label: string | null;
  isActive: boolean;
  employee: {
    externalId: string;
    displayName: string;
    extension: string | null;
  } | null;
  linkedUser: { id: string; email: string; name: string } | null;
  linkedInvitation: { id: string; email: string; role: string } | null;
  link: PbxLinkInfo | null;
  candidates: PbxCandidateUser[];
}

export type ReportType = "daily" | "weekly" | "monthly";

export const REPORT_TYPE_LABELS = {
  daily: "Ежедневный",
  weekly: "Еженедельный",
  monthly: "Ежемесячный",
} as const;

export function getReportTypeLabel(reportType: ReportType): string {
  return REPORT_TYPE_LABELS[reportType];
}

export interface SettingsState {
  ftp: FtpSettings;
  integrations: IntegrationsSettings;
  megaPbx: MegaPbxSettings;
  loading: boolean;
  saving: boolean;
  backupLoading: boolean;
  sendTestLoading: boolean;
  sendTestReportType: ReportType | null;
  sendTestMessage: string;
  ftpSaving: boolean;
  ftpTesting: boolean;
  ftpTestMessage: string;
  ftpConnectionStatus: FtpConnectionStatus | null;
  ftpStatusLoading: boolean;
  telegramSaving: boolean;
  maxBotSaving: boolean;
  megaPbxSaving: boolean;
  megaPbxAccessSaving: boolean;
  megaPbxSyncOptionsSaving: boolean;
  megaPbxExcludedNumbersSaving: boolean;
  megaPbxWebhookSaving: boolean;
  megaPbxTesting: boolean;
  megaPbxSyncing: "directory" | "calls" | null;
  megaPbxTestMessage: string;
  megaPbxEmployeesLoading: boolean;
  megaPbxNumbersLoading: boolean;
  megaPbxEmployees: PbxEmployeeItem[];
  megaPbxNumbers: PbxNumberItem[];
}

export interface TelegramSectionProps {
  sendTestLoading: boolean;
  sendTestReportType: ReportType | null;
  sendTestMessage: string;
  onSendTest: (reportType: ReportType) => void;
}

export interface IntegrationsSectionProps {
  integrations: IntegrationsSettings;
  onTelegramTokenChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onMaxBotTokenChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onSaveTelegram: () => Promise<void>;
  onSaveMaxBot: () => Promise<void>;
  telegramSaving: boolean;
  maxBotSaving: boolean;
}

export interface PbxSectionProps {
  megaPbx: MegaPbxSettings;
  onEnabledChange: (checked: boolean) => void;
  onSaveAccess: (
    data: import("../megapbx/schemas").AccessFormData,
  ) => Promise<void>;
  onSaveSyncOptions: (
    data: import("../megapbx/schemas").SyncOptionsFormData,
  ) => Promise<void>;
  onSaveWebhook: (
    data: import("../megapbx/schemas").WebhookFormData,
  ) => Promise<void>;
  onSaveExcludedNumbers: (excludePhoneNumbers: string[]) => Promise<void>;
  onTest: (baseUrl?: string, apiKey?: string) => Promise<void>;
  onSyncDirectory: () => Promise<void>;
  onSyncCalls: () => Promise<void>;
  onLink: (input: {
    targetType: "employee" | "number";
    targetExternalId: string;
    userId?: string | null;
    invitationId?: string | null;
  }) => Promise<void>;
  onUnlink: (input: {
    targetType: "employee" | "number";
    targetExternalId: string;
  }) => Promise<void>;
  saving: boolean;
  savingAccess: boolean;
  savingSyncOptions: boolean;
  savingExcludedNumbers: boolean;
  savingWebhook: boolean;
  testing: boolean;
  syncing: "directory" | "calls" | null;
  testMessage: string;
  employeesLoading: boolean;
  numbersLoading: boolean;
  employees: PbxEmployeeItem[];
  numbers: PbxNumberItem[];
}

export interface BackupSectionProps {
  backupLoading: boolean;
  onBackup: () => void;
}
