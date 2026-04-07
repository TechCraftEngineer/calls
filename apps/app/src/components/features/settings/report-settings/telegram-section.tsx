import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldLabel,
  Input,
  Label,
  Separator,
} from "@calls/ui";
import type React from "react";
import { useState } from "react";
import type { User } from "@/lib/auth";
import { SendTestReportButton } from "../telegram/send-test-report-button";
import { REPORT_TYPE_LABELS, type ReportType } from "../types";
import type { ReportSettingsForm } from "./report-settings-types";
import { ReportDeliveryFrequency, ReportTimeSettings } from "./shared-report-controls";
import { TelegramConnectDialog } from "./telegram-connect-dialog";

interface TelegramSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  isAdmin: boolean;
  onSave: () => void;
  saving: boolean;
  sendTestLoading?: boolean;
  sendTestSuccess?: boolean;
  sendTestReportType?: ReportType | null;
  sendTestMessage?: string;
  onSendTest?: (reportType: ReportType) => void;
  user?: User;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onCheckConnection?: () => void;
  connectLoading?: boolean;
  disconnectLoading?: boolean;
  // Новые пропсы для диалога подключения
  telegramAuthUrl?: string | null;
  telegramBotUsername?: string;
  telegramConnectToken?: string;
  // Alias props (used by older call sites)
  connecting?: boolean;
  disconnecting?: boolean;
  checkConnectionLoading?: boolean;
}

export function TelegramReportSection({
  form,
  setForm,
  isAdmin,
  onSave,
  saving,
  sendTestLoading,
  sendTestSuccess,
  sendTestReportType,
  sendTestMessage,
  onSendTest,
  user,
  onConnect,
  onDisconnect,
  onCheckConnection,
  connectLoading,
  disconnectLoading,
  telegramAuthUrl,
  telegramBotUsername,
  telegramConnectToken,
  connecting,
  disconnecting,
  checkConnectionLoading,
}: TelegramSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const sendTestLoadingSafe = sendTestLoading ?? false;
  const sendTestMessageSafe = sendTestMessage ?? "";
  const sendTestSuccessSafe = sendTestSuccess ?? false;

  const effectiveConnectLoading = connectLoading ?? connecting ?? false;
  const effectiveDisconnectLoading = disconnectLoading ?? disconnecting ?? false;

  const canSendTest = form.telegramChatId?.trim() && !sendTestLoadingSafe;
  const hasTelegram = !!form.telegramChatId?.trim();
  const primaryReportType = sendTestReportType ?? "daily";
  const primaryReportLabel = REPORT_TYPE_LABELS[primaryReportType] ?? REPORT_TYPE_LABELS.daily;

  // Обработчик открытия диалога подключения
  const handleConnectClick = () => {
    // Сначала вызываем onConnect для генерации URL
    onConnect?.();
    // Открываем диалог
    setDialogOpen(true);
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base">Telegram Отчеты</CardTitle>
        <CardDescription>
          Полные настройки Telegram-отчетов: периодичность, расписание, формат и мгновенная отправка
          выбранного типа.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field className="mb-3">
          <FieldLabel asChild>
            <Label>Telegram Chat ID</Label>
          </FieldLabel>
          <div className="flex gap-2">
            <Input
              type="text"
              value={form.telegramChatId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  telegramChatId: e.target.value,
                }))
              }
              className="flex-1"
              placeholder="Нажмите «Подключить Telegram» или введите ID вручную"
            />
            {hasTelegram && onDisconnect && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDisconnect}
                disabled={effectiveDisconnectLoading}
                className="shrink-0 text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {effectiveDisconnectLoading ? "…" : "Отвязать"}
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Можно подключить Telegram по кнопке или указать Chat ID вручную.
          </p>
          {user && onConnect && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {!hasTelegram ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleConnectClick}
                    disabled={effectiveConnectLoading}
                  >
                    {effectiveConnectLoading ? "…" : "Подключить Telegram"}
                  </Button>
                  {onCheckConnection && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onCheckConnection}
                      disabled={checkConnectionLoading}
                    >
                      {checkConnectionLoading ? "…" : "Проверить подключение"}
                    </Button>
                  )}
                </>
              ) : (
                onCheckConnection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCheckConnection}
                    disabled={checkConnectionLoading}
                  >
                    {checkConnectionLoading ? "…" : "Проверить подключение"}
                  </Button>
                )
              )}
            </div>
          )}
        </Field>
        <ReportDeliveryFrequency form={form} setForm={setForm} channel="telegram" />
        <Separator />
        {onSendTest && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <SendTestReportButton
                onSendTest={onSendTest}
                primaryReportType={primaryReportType}
                primaryReportLabel={primaryReportLabel}
                sendTestLoading={sendTestLoadingSafe}
                canSendTest={Boolean(canSendTest)}
                variant={canSendTest ? "success" : "default"}
                size="sm"
              />
              {sendTestMessageSafe && (
                <span
                  className={`text-sm ${sendTestSuccessSafe ? "text-success" : "text-destructive"}`}
                >
                  {sendTestMessageSafe}
                </span>
              )}
            </div>
            {!form.telegramChatId?.trim() && (
              <p className="text-xs text-muted-foreground">
                Сначала подключите Telegram или укажите Telegram Chat ID, затем можно отправить
                тестовый отчёт.
              </p>
            )}
          </div>
        )}
        {isAdmin && <ReportTimeSettings form={form} setForm={setForm} />}
      </CardContent>
      <CardFooter className="px-4 pt-0 flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </CardFooter>

      {/* Диалог подключения Telegram */}
      <TelegramConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        url={telegramAuthUrl}
        botUsername={telegramBotUsername ?? "mango_react_bot"}
        token={telegramConnectToken ?? ""}
        loading={effectiveConnectLoading}
      />
    </Card>
  );
}
