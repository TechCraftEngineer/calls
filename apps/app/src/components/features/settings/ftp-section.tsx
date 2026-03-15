"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  PasswordInput,
} from "@calls/ui";
import type { FtpConnectionStatus, Prompt } from "./types";

interface FtpSectionProps {
  prompts: Record<string, Prompt>;
  onPromptChange: (
    key: string,
    field: "value" | "description",
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onEnabledChange: (enabled: boolean) => void;
  onSave: () => Promise<void>;
  onTest: () => Promise<void>;
  saving: boolean;
  testing: boolean;
  testMessage: string;
  connectionStatus: FtpConnectionStatus | null;
  statusLoading: boolean;
}

export default function FtpSection({
  prompts,
  onPromptChange,
  onEnabledChange,
  onSave,
  onTest,
  saving,
  testing,
  testMessage,
  connectionStatus,
  statusLoading,
}: FtpSectionProps) {
  const enabled = prompts.ftp_enabled?.value === "true";
  const host = prompts.ftp_host?.value ?? "";
  const user = prompts.ftp_user?.value ?? "";
  const password = prompts.ftp_password?.value ?? "";
  const passwordSet = prompts.ftp_password?.meta?.passwordSet;
  const hasValues = host.trim() || user.trim() || password;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                📁
              </span>
              FTP (загрузка записей с PBX)
            </CardTitle>
            <CardDescription className="mt-1">
              Подключение к FTP-серверу PBX для автоматической загрузки записей
              звонков. Учётные данные хранятся в базе в зашифрованном виде.
            </CardDescription>
          </div>
          <label
            htmlFor="ftp-enabled"
            className="flex cursor-pointer items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3 transition-colors hover:bg-muted has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <Checkbox
              id="ftp-enabled"
              checked={enabled}
              onCheckedChange={(checked) => onEnabledChange(checked === true)}
              className="size-5"
            />
            <span className="text-sm font-semibold">
              {enabled ? "Интеграция включена" : "Интеграция выключена"}
            </span>
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ftp-host" className="text-xs text-muted-foreground">
              Host
            </Label>
            <Input
              id="ftp-host"
              type="text"
              value={host}
              onChange={onPromptChange("ftp_host", "value")}
              placeholder="ftp.example.com"
              autoComplete="off"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ftp-user" className="text-xs text-muted-foreground">
              User
            </Label>
            <Input
              id="ftp-user"
              type="text"
              value={user}
              onChange={onPromptChange("ftp_user", "value")}
              placeholder="FTP пользователь"
              autoComplete="off"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="ftp-password"
              className="text-xs text-muted-foreground"
            >
              Password
            </Label>
            <PasswordInput
              id="ftp-password"
              value={password}
              onChange={onPromptChange("ftp_password", "value")}
              placeholder={
                passwordSet
                  ? "•••••••• (оставьте пустым, чтобы не менять)"
                  : "FTP пароль"
              }
              autoComplete="off"
              className="h-9"
            />
          </div>
        </div>

        {(connectionStatus?.configured || statusLoading) && (
          <div className="rounded-lg border p-3">
            {statusLoading ? (
              <p className="text-sm text-muted-foreground">
                Проверка подключения…
              </p>
            ) : connectionStatus?.success === true ? (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ {connectionStatus.message}
              </p>
            ) : connectionStatus?.success === false ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                ✗ Подключение не успешное
                {connectionStatus.message && (
                  <span className="block mt-1 text-muted-foreground">
                    {connectionStatus.message}
                  </span>
                )}
              </p>
            ) : null}
          </div>
        )}

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
