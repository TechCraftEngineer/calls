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

export interface SettingsState {
  prompts: Record<string, Prompt>;
  loading: boolean;
  saving: boolean;
  backupLoading: boolean;
  sendTestLoading: boolean;
  sendTestMessage: string;
  ftpSaving: boolean;
  ftpTesting: boolean;
  ftpTestMessage: string;
  ftpConnectionStatus: FtpConnectionStatus | null;
  ftpStatusLoading: boolean;
  telegramSaving: boolean;
  maxBotSaving: boolean;
}

export interface TelegramSectionProps {
  sendTestLoading: boolean;
  sendTestMessage: string;
  onSendTest: () => void;
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

export interface BackupSectionProps {
  backupLoading: boolean;
  onBackup: () => void;
}
