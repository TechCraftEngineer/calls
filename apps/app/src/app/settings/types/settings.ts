export interface Prompt {
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

export interface SettingsState {
  prompts: Record<string, Prompt>;
  loading: boolean;
  saving: boolean;
  backupLoading: boolean;
  sendTestLoading: boolean;
  sendTestMessage: string;
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
}

export interface PromptSectionProps {
  key: string;
  title: string;
  prompt: Prompt;
  onPromptChange: (
    key: string,
    field: "value" | "description",
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export interface BackupSectionProps {
  backupLoading: boolean;
  onBackup: () => void;
}
