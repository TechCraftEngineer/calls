"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PasswordInput,
} from "@calls/ui";
import type { Prompt } from "./types";

interface MegafonFtpSectionProps {
  prompts: Record<string, Prompt>;
  onPromptChange: (
    key: string,
    field: "value" | "description",
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSave: () => Promise<void>;
  onTest: () => Promise<void>;
  saving: boolean;
  testing: boolean;
  testMessage: string;
}

export default function MegafonFtpSection({
  prompts,
  onPromptChange,
  onSave,
  onTest,
  saving,
  testing,
  testMessage,
}: MegafonFtpSectionProps) {
  const host = prompts.megafon_ftp_host?.value ?? "";
  const user = prompts.megafon_ftp_user?.value ?? "";
  const password = prompts.megafon_ftp_password?.value ?? "";
  const hasValues = host.trim() || user.trim() || password;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10">
            📁
          </span>
          Megafon FTP (загрузка записей с PBX)
        </CardTitle>
        <CardDescription>
          Подключение к FTP-серверу Megafon PBX для автоматической загрузки
          записей звонков
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label
              htmlFor="megafon-ftp-host"
              className="text-xs text-muted-foreground"
            >
              Host
            </Label>
            <Input
              id="megafon-ftp-host"
              type="text"
              value={host}
              onChange={onPromptChange("megafon_ftp_host", "value")}
              placeholder="records.megapbx.ru"
              autoComplete="off"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="megafon-ftp-user"
              className="text-xs text-muted-foreground"
            >
              User
            </Label>
            <Input
              id="megafon-ftp-user"
              type="text"
              value={user}
              onChange={onPromptChange("megafon_ftp_user", "value")}
              placeholder="FTP пользователь"
              autoComplete="off"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="megafon-ftp-password"
              className="text-xs text-muted-foreground"
            >
              Password
            </Label>
            <PasswordInput
              id="megafon-ftp-password"
              value={password}
              onChange={onPromptChange("megafon_ftp_password", "value")}
              placeholder="FTP пароль"
              autoComplete="off"
              className="h-9"
            />
          </div>
        </div>

        {testMessage && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              testMessage.includes("установлено") ||
              testMessage.includes("корректны")
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
            }`}
          >
            {testMessage}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={onTest}
            disabled={testing || !hasValues}
          >
            {testing ? "Проверка…" : "Проверить подключение"}
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
