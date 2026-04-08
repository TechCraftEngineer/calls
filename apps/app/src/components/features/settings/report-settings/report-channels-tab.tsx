"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldLabel,
  Input,
  Label,
  Separator,
  Switch,
} from "@calls/ui";
import { Building2, Mail, MessageCircle, Send, Unlink } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { User } from "@/lib/auth";
import { SendTestReportButton } from "../telegram/send-test-report-button";
import { REPORT_TYPE_LABELS } from "../types";
import type { ReportSettingsForm } from "./report-settings-types";
import { ReportDeliveryFrequency } from "./shared-report-controls";
import { TelegramConnectDialog } from "./telegram-connect-dialog";
import { useReportSettingsMutations } from "./use-report-settings-mutations";
import { getReportWeeklyDay } from "./utils";

interface ReportChannelsTabProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  user: User;
  isAdmin: boolean;
}

export function ReportChannelsTab({ form, setForm, user, isAdmin }: ReportChannelsTabProps) {
  const userId = String(user.id);
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);

  const {
    telegramAuthUrl,
    telegramConnectToken,
    telegramBotUsername,
    sendTestMessage,
    sendTestEmailMessage,
    telegramAuthUrlMutation,
    disconnectTelegramMutation,
    updateEmailMutation,
    updateTelegramMutation,
    updateMaxMutation,
    sendTestMutation,
    sendTestEmailMutation,
    handleTelegramConnect,
    handleTelegramDisconnect,
    handleSendTest,
    handleSendTestEmail,
    performUpdates,
  } = useReportSettingsMutations({ user, setForm });

  // Email channel enabled state
  const isEmailEnabled = form.emailDailyReport || form.emailWeeklyReport || form.emailMonthlyReport;

  // Telegram channel enabled state
  const isTelegramEnabled =
    form.telegramDailyReport || form.telegramWeeklyReport || form.telegramMonthlyReport;
  const hasTelegram = !!form.telegramChatId?.trim();

  // MAX channel enabled state
  const isMaxEnabled = form.maxDailyReport || form.maxManagerReport;

  const handleSaveEmail = async () => {
    const email = form.email.trim();
    await performUpdates({
      successMessage: "Настройки email сохранены",
      errorMessage: "Не удалось сохранить настройки email",
      invalidateScheduleAfter: isAdmin,
      run: async () => {
        const tasks: Promise<unknown>[] = [
          updateEmailMutation.mutateAsync({
            user_id: userId,
            data: {
              email: email ? email : null,
              emailDailyReport: form.emailDailyReport,
              emailWeeklyReport: form.emailWeeklyReport,
              emailMonthlyReport: form.emailMonthlyReport,
            },
          }),
        ];
        if (isAdmin) {
          tasks.push(
            updateTelegramMutation.mutateAsync({
              user_id: userId,
              data: {
                reportDailyTime: form.reportDailyTime,
                reportWeeklyDay: getReportWeeklyDay(form.reportWeeklyDay),
                reportWeeklyTime: form.reportWeeklyTime,
                reportMonthlyDay: form.reportMonthlyDay,
                reportMonthlyTime: form.reportMonthlyTime,
              },
            }),
          );
        }
        await Promise.all(tasks);
      },
    });
  };

  const handleSaveTelegram = async () => {
    const telegramChatId = form.telegramChatId.trim();
    const reportWeeklyDay = getReportWeeklyDay(form.reportWeeklyDay);
    await performUpdates({
      successMessage: "Настройки Telegram сохранены",
      errorMessage: "Не удалось сохранить настройки Telegram",
      invalidateScheduleAfter: isAdmin,
      run: async () => {
        await updateTelegramMutation.mutateAsync({
          user_id: userId,
          data: {
            telegramDailyReport: form.telegramDailyReport,
            telegramWeeklyReport: form.telegramWeeklyReport,
            telegramMonthlyReport: form.telegramMonthlyReport,
            telegramSkipWeekends: form.telegramSkipWeekends,
            telegramChatId: telegramChatId ? telegramChatId : null,
            ...(isAdmin
              ? {
                  reportDailyTime: form.reportDailyTime,
                  reportWeeklyDay,
                  reportWeeklyTime: form.reportWeeklyTime,
                  reportMonthlyDay: form.reportMonthlyDay,
                  reportMonthlyTime: form.reportMonthlyTime,
                }
              : {}),
          },
        });
      },
    });
  };

  const handleSaveMax = async () => {
    const maxChatId = form.maxChatId.trim();
    await performUpdates({
      successMessage: "Настройки MAX сохранены",
      errorMessage: "Не удалось сохранить настройки MAX",
      invalidateScheduleAfter: isAdmin,
      run: async () => {
        const tasks: Promise<unknown>[] = [
          updateMaxMutation.mutateAsync({
            user_id: userId,
            data: {
              maxChatId: maxChatId ? maxChatId : null,
              maxDailyReport: form.maxDailyReport,
              maxManagerReport: form.maxManagerReport,
            },
          }),
        ];
        if (isAdmin) {
          tasks.push(
            updateTelegramMutation.mutateAsync({
              user_id: userId,
              data: {
                reportDailyTime: form.reportDailyTime,
                reportWeeklyDay: getReportWeeklyDay(form.reportWeeklyDay),
                reportWeeklyTime: form.reportWeeklyTime,
                reportMonthlyDay: form.reportMonthlyDay,
                reportMonthlyTime: form.reportMonthlyTime,
              },
            }),
          );
        }
        await Promise.all(tasks);
      },
    });
  };

  const handleTelegramConnectClick = () => {
    handleTelegramConnect?.();
    setTelegramDialogOpen(true);
  };

  const canSendTestEmail = Boolean(form.email.trim()) && !sendTestEmailMutation.isPending;
  const canSendTestTelegram = Boolean(form.telegramChatId?.trim()) && !sendTestMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Email Channel Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail
                className={`h-5 w-5 ${isEmailEnabled ? "text-primary" : "text-muted-foreground"}`}
              />
              <div>
                <CardTitle className="text-base">Email отчёты</CardTitle>
                <CardDescription>Отправка отчётов на электронную почту</CardDescription>
              </div>
            </div>
            <Switch
              checked={isEmailEnabled}
              onCheckedChange={async (checked) => {
                if (!checked) {
                  // Сначала обновляем форму, потом сохраняем на сервере
                  setForm((f) => ({
                    ...f,
                    emailDailyReport: false,
                    emailWeeklyReport: false,
                    emailMonthlyReport: false,
                  }));
                  // Небольшая задержка для применения состояния, затем сохраняем
                  setTimeout(() => handleSaveEmail(), 0);
                } else {
                  setForm((f) => ({ ...f, emailDailyReport: true }));
                }
              }}
            />
          </div>
        </CardHeader>

        {isEmailEnabled && (
          <>
            <Separator />
            <CardContent className="pt-4 space-y-4">
              <Field>
                <FieldLabel asChild>
                  <Label>Email адрес</Label>
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="flex-1"
                  />
                  <SendTestReportButton
                    onSendTest={handleSendTestEmail}
                    primaryReportType="daily"
                    primaryReportLabel={REPORT_TYPE_LABELS.daily}
                    sendTestLoading={sendTestEmailMutation.isPending}
                    canSendTest={canSendTestEmail}
                    variant="default"
                    size="sm"
                  />
                </div>
                {sendTestEmailMessage && (
                  <p
                    className={`text-sm mt-1 ${sendTestEmailMutation.isSuccess ? "text-green-600" : "text-destructive"}`}
                  >
                    {sendTestEmailMessage}
                  </p>
                )}
              </Field>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Периодичность</Label>
                <ReportDeliveryFrequency form={form} setForm={setForm} channel="email" />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveEmail}
                  disabled={updateEmailMutation.isPending}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {updateEmailMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      {/* Telegram Channel Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle
                className={`h-5 w-5 ${isTelegramEnabled ? "text-primary" : "text-muted-foreground"}`}
              />
              <div>
                <CardTitle className="text-base">Telegram отчёты</CardTitle>
                <CardDescription>Отправка отчётов в Telegram</CardDescription>
              </div>
            </div>
            <Switch
              checked={isTelegramEnabled}
              onCheckedChange={async (checked) => {
                if (!checked) {
                  setForm((f) => ({
                    ...f,
                    telegramDailyReport: false,
                    telegramWeeklyReport: false,
                    telegramMonthlyReport: false,
                  }));
                  setTimeout(() => handleSaveTelegram(), 0);
                } else {
                  setForm((f) => ({ ...f, telegramDailyReport: true }));
                }
              }}
            />
          </div>
        </CardHeader>

        {isTelegramEnabled && (
          <>
            <Separator />
            <CardContent className="pt-4 space-y-4">
              <Field>
                <FieldLabel asChild>
                  <Label>Telegram Chat ID</Label>
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={form.telegramChatId}
                    onChange={(e) => setForm((f) => ({ ...f, telegramChatId: e.target.value }))}
                    placeholder="Введите Chat ID или подключите Telegram"
                    className="flex-1"
                  />
                  {hasTelegram ? (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleTelegramDisconnect}
                      disabled={disconnectTelegramMutation.isPending}
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      title="Отвязать Telegram"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTelegramConnectClick}
                      disabled={telegramAuthUrlMutation.isPending}
                    >
                      Подключить
                    </Button>
                  )}
                  <SendTestReportButton
                    onSendTest={handleSendTest}
                    primaryReportType="daily"
                    primaryReportLabel={REPORT_TYPE_LABELS.daily}
                    sendTestLoading={sendTestMutation.isPending}
                    canSendTest={canSendTestTelegram}
                    variant="default"
                    size="sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Можно подключить автоматически по кнопке или указать Chat ID вручную
                </p>
                {sendTestMessage && (
                  <p
                    className={`text-sm mt-1 ${sendTestMutation.isSuccess ? "text-green-600" : "text-destructive"}`}
                  >
                    {sendTestMessage}
                  </p>
                )}
              </Field>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Периодичность</Label>
                <ReportDeliveryFrequency form={form} setForm={setForm} channel="telegram" />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveTelegram}
                  disabled={updateTelegramMutation.isPending}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {updateTelegramMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </CardContent>
          </>
        )}

        <TelegramConnectDialog
          open={telegramDialogOpen}
          onOpenChange={setTelegramDialogOpen}
          url={telegramAuthUrl}
          botUsername={telegramBotUsername ?? "mango_react_bot"}
          token={telegramConnectToken ?? ""}
          loading={telegramAuthUrlMutation.isPending}
        />
      </Card>

      {/* MAX Channel Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2
                className={`h-5 w-5 ${isMaxEnabled ? "text-primary" : "text-muted-foreground"}`}
              />
              <div>
                <CardTitle className="text-base">MAX интеграция</CardTitle>
                <CardDescription>Интеграция с MAX для отчётности</CardDescription>
              </div>
            </div>
            <Switch
              checked={isMaxEnabled}
              onCheckedChange={async (checked) => {
                if (!checked) {
                  setForm((f) => ({
                    ...f,
                    maxDailyReport: false,
                    maxManagerReport: false,
                  }));
                  setTimeout(() => handleSaveMax(), 0);
                } else {
                  setForm((f) => ({ ...f, maxDailyReport: true }));
                }
              }}
            />
          </div>
        </CardHeader>

        {isMaxEnabled && (
          <>
            <Separator />
            <CardContent className="pt-4 space-y-4">
              <Field>
                <FieldLabel asChild>
                  <Label>MAX Chat ID</Label>
                </FieldLabel>
                <Input
                  type="text"
                  value={form.maxChatId}
                  onChange={(e) => setForm((f) => ({ ...f, maxChatId: e.target.value }))}
                  placeholder="Введите MAX Chat ID"
                />
              </Field>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Опции</Label>
                <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                  <Switch
                    checked={form.maxDailyReport}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, maxDailyReport: checked }))
                    }
                    size="sm"
                  />
                  Ежедневный отчёт
                </Label>
                <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                  <Switch
                    checked={form.maxManagerReport}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, maxManagerReport: checked }))
                    }
                    size="sm"
                  />
                  Менеджерский отчёт
                </Label>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveMax} disabled={updateMaxMutation.isPending} size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  {updateMaxMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
