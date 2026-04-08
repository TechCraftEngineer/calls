import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from "@calls/ui";
import type React from "react";
import type { User } from "@/lib/auth";
import {
  EmailReportSection,
  ManagedUsersSection,
  MaxReportSection,
  TelegramReportSection,
} from "./index";
import type { ReportSettingsForm, ReportSettingsUserOption } from "./report-settings-types";
import { useReportSettingsMutations } from "./use-report-settings-mutations";
import { getReportWeeklyDay } from "./utils";

interface ReportSettingsFormBodyProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  user: User;
  isAdmin: boolean;
  allUsers: ReportSettingsUserOption[];
}

export default function ReportSettingsFormBody({
  form,
  setForm,
  user,
  isAdmin,
  allUsers,
}: ReportSettingsFormBodyProps) {
  const userId = String(user.id);

  const {
    telegramAuthUrl,
    telegramConnectToken,
    telegramBotUsername,
    sendTestMessage,
    sendTestEmailMessage,
    isSavingCombined,
    isSavingAny,
    telegramAuthUrlMutation,
    disconnectTelegramMutation,
    updateEmailMutation,
    updateTelegramMutation,
    updateMaxMutation,
    updateReportManagedUsersMutation,
    sendTestMutation,
    sendTestEmailMutation,
    handleTelegramConnect,
    handleTelegramDisconnect,
    handleSendTest,
    handleSendTestEmail,
    performUpdates,
  } = useReportSettingsMutations({ user, setForm });

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

  const handleSaveManagedUsers = async () => {
    await performUpdates({
      successMessage: "Сводные менеджеры сохранены",
      errorMessage: "Не удалось сохранить сводные настройки менеджеров",
      run: async () => {
        await updateReportManagedUsersMutation.mutateAsync({
          user_id: userId,
          data: {
            reportManagedUserIds: form.reportManagedUserIds ?? [],
          },
        });
      },
    });
  };

  const handleSaveAll = async () => {
    await performUpdates({
      successMessage: "Настройки отчётов сохранены",
      errorMessage: "Не удалось сохранить настройки отчётов",
      run: async () => {
        const tasks: Promise<unknown>[] = [];
        tasks.push(
          updateEmailMutation.mutateAsync({
            user_id: userId,
            data: {
              email: form.email,
              emailDaily: form.emailDaily,
              emailWeekly: form.emailWeekly,
              emailMonthly: form.emailMonthly,
            },
          }),
        );
        tasks.push(
          updateTelegramMutation.mutateAsync({
            user_id: userId,
            data: {
              telegramChatId: form.telegramChatId,
              telegramDaily: form.telegramDaily,
              telegramWeekly: form.telegramWeekly,
              telegramMonthly: form.telegramMonthly,
            },
          }),
        );
        tasks.push(
          updateMaxMutation.mutateAsync({
            user_id: userId,
            data: {
              maxChatId: form.maxChatId,
              maxDaily: form.maxDaily,
              maxWeekly: form.maxWeekly,
              maxMonthly: form.maxMonthly,
              maxManagerReport: form.maxManagerReport,
            },
          }),
        );
        if (isAdmin) {
          tasks.push(
            updateReportManagedUsersMutation.mutateAsync({
              user_id: userId,
              data: {
                reportManagedUserIds: form.reportManagedUserIds ?? [],
              },
            }),
          );
        }
        await Promise.all(tasks);
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Настройки отчётов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <EmailReportSection
            form={form}
            setForm={setForm}
            isAdmin={isAdmin}
            saving={isSavingCombined || updateEmailMutation.isPending}
            onSave={handleSaveEmail}
            onSendTest={handleSendTestEmail}
            sendTestLoading={sendTestEmailMutation.isPending}
            sendTestSuccess={Boolean(sendTestEmailMessage)}
            sendTestReportType={null}
            sendTestMessage={sendTestEmailMessage}
          />
          <TelegramReportSection
            form={form}
            setForm={setForm}
            isAdmin={isAdmin}
            user={user}
            onConnect={handleTelegramConnect}
            onDisconnect={handleTelegramDisconnect}
            connecting={telegramAuthUrlMutation.isPending}
            disconnecting={disconnectTelegramMutation.isPending}
            saving={isSavingCombined || updateTelegramMutation.isPending}
            onSave={handleSaveTelegram}
            onSendTest={handleSendTest}
            sendTestLoading={sendTestMutation.isPending}
            sendTestSuccess={Boolean(sendTestMessage)}
            sendTestReportType={null}
            sendTestMessage={sendTestMessage}
            telegramAuthUrl={telegramAuthUrl}
            telegramBotUsername={telegramBotUsername}
            telegramConnectToken={telegramConnectToken}
          />
          <MaxReportSection
            form={form}
            setForm={setForm}
            isAdmin={isAdmin}
            saving={isSavingCombined || updateMaxMutation.isPending}
            onSave={handleSaveMax}
          />
          {isAdmin && (
            <ManagedUsersSection
              form={form}
              setForm={setForm}
              user={{ id: String(user.id) }}
              allUsers={allUsers}
              saving={isSavingCombined || updateReportManagedUsersMutation.isPending}
              onSave={handleSaveManagedUsers}
            />
          )}
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-6">
          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={isSavingAny}
            className="w-full sm:w-auto"
          >
            {isSavingAny ? "Сохранение…" : "Сохранить все настройки"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
