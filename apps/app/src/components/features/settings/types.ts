export interface Prompt {
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
  meta?: { passwordSet?: boolean };
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
  prompts: Record<string, Prompt>;
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
  megaPbxTesting: boolean;
  megaPbxSyncing: "directory" | "calls" | "recordings" | null;
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
  prompts: Record<string, Prompt>;
  onPromptChange: (
    key: string,
    field: "value" | "description",
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSaveTelegram: () => Promise<void>;
  onSaveMaxBot: () => Promise<void>;
  telegramSaving: boolean;
  maxBotSaving: boolean;
}

export interface PbxSectionProps {
  prompts: Record<string, Prompt>;
  onPromptValueChange: (key: string, value: string) => void;
  onPromptChange: (
    key: string,
    field: "value" | "description",
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onToggleChange: (key: string, checked: boolean) => void;
  onSave: () => Promise<void>;
  onTest: () => Promise<void>;
  onSyncDirectory: () => Promise<void>;
  onSyncCalls: () => Promise<void>;
  onSyncRecordings: () => Promise<void>;
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
  testing: boolean;
  syncing: "directory" | "calls" | "recordings" | null;
  testMessage: string;
  employeesLoading: boolean;
  numbersLoading: boolean;
  employees: PbxEmployeeItem[];
  numbers: PbxNumberItem[];
}

export type MegaPbxCandidateUser = PbxCandidateUser;
export type MegaPbxCandidateInvitation = PbxCandidateInvitation;
export type MegaPbxLinkInfo = PbxLinkInfo;
export type MegaPbxEmployeeItem = PbxEmployeeItem;
export type MegaPbxNumberItem = PbxNumberItem;
export type MegaPbxSectionProps = PbxSectionProps;

export interface BackupSectionProps {
  backupLoading: boolean;
  onBackup: () => void;
}
