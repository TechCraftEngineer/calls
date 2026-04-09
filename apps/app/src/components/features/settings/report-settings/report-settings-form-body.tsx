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

  const handleSaveAll = async () => {
    await performUpdates({
      successMessage: "Настройки отчётов сохранены",
      errorMessage: "Не удалось сохранить настройки отчётов",
      run: async () => {
        const tasks: Promise<unknown>[] = [];
        tasks.push(
          updateEmailMutation.mutateAsync({
            userId: userId,
            data: {
              email: form.email,
              emailDailyReport: form.emailDailyReport,
              emailWeeklyReport: form.emailWeeklyReport,
              emailMonthlyReport: form.emailMonthlyReport,
            },
          }),
        );
        tasks.push(
          updateTelegramMutation.mutateAsync({
            userId: userId,
            data: {
              telegramChatId: form.telegramChatId,
              telegramDailyReport: form.telegramDailyReport,
              telegramWeeklyReport: form.telegramWeeklyReport,
              telegramMonthlyReport: form.telegramMonthlyReport,
              telegramSkipWeekends: form.telegramSkipWeekends,
            },
          }),
        );
        tasks.push(
          updateMaxMutation.mutateAsync({
            userId: userId,
            data: {
              maxChatId: form.maxChatId,
              maxDailyReport: form.maxDailyReport,
              maxManagerReport: form.maxManagerReport,
            },
          }),
        );
        if (isAdmin) {
          tasks.push(
            updateReportManagedUsersMutation.mutateAsync({
              userId: userId,
              data: {
                reportManagedUserIds: form.reportManagedUserIds ?? [],
              },
            }),
          );
        }
        const results = await Promise.allSettled(tasks);
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          throw new Error(
            `Не удалось сохранить ${failures.length} из ${tasks.length} настроек отчётов`,
          );
        }
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
            onSendTest={handleSendTest}
            sendTestLoading={sendTestMutation.isPending}
            sendTestSuccess={Boolean(sendTestMessage)}
            sendTestReportType={null}
            sendTestMessage={sendTestMessage}
            telegramAuthUrl={telegramAuthUrl}
            telegramBotUsername={telegramBotUsername}
            telegramConnectToken={telegramConnectToken}
          />
          <MaxReportSection form={form} setForm={setForm} isAdmin={isAdmin} />
          {isAdmin && (
            <ManagedUsersSection
              form={form}
              setForm={setForm}
              user={{ id: String(user.id) }}
              allUsers={allUsers}
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
