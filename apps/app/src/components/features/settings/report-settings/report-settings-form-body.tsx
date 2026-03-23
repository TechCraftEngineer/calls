import { Card, CardContent, CardHeader, CardTitle, toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useRef, useState } from "react";
import type { User } from "@/lib/auth";
import { useORPC } from "@/orpc/react";
import { getReportTypeLabel, type ReportType } from "../types";
import {
  EmailReportSection,
  ManagedUsersSection,
  MaxReportSection,
  ReportParamsSection,
  TelegramReportSection,
} from "./index";
import type {
  ReportSettingsForm,
  ReportSettingsUserOption,
} from "./report-settings-types";

interface ReportSettingsFormBodyProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  user: User;
  isAdmin: boolean;
  allUsers: ReportSettingsUserOption[];
}

type WeekDay = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

const WEEK_DAYS: WeekDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getReportWeeklyDay(day: string): WeekDay {
  return WEEK_DAYS.includes(day as WeekDay) ? (day as WeekDay) : "fri";
}

export default function ReportSettingsFormBody({
  form,
  setForm,
  user,
  isAdmin,
  allUsers,
}: ReportSettingsFormBodyProps) {
  const orpc = useORPC();
  const userId = String(user.id);
  const queryClient = useQueryClient();

  const invalidateUser = () => {
    queryClient.invalidateQueries({
      queryKey: orpc.users.getForEdit.queryKey({ input: { user_id: userId } }),
    });
  };

  const invalidateSchedule = () => {
    queryClient.invalidateQueries({
      queryKey: orpc.settings.getReportScheduleSettings.queryKey(),
    });
  };

  const handleMutationError = (err: unknown, fallback: string) => {
    const msg = err instanceof Error ? err.message : fallback;
    toast.error(msg);
  };

  const telegramAuthUrlMutation = useMutation(
    orpc.users.telegramAuthUrl.mutationOptions({
      onSuccess: (res) => {
        if (res?.url) {
          window.open(res.url, "_blank");
          toast.success(
            "Откройте Telegram и нажмите «Старт» в чате с ботом. Затем нажмите «Проверить подключение».",
          );
        } else {
          toast.error("Не удалось получить ссылку для подключения");
        }
      },
      onError: () => toast.error("Ошибка при создании ссылки для Telegram"),
    }),
  );

  const disconnectTelegramMutation = useMutation(
    orpc.users.disconnectTelegram.mutationOptions({
      onSuccess: () => {
        setForm((f) => ({ ...f, telegramChatId: "" }));
        toast.success("Telegram отвязан");
      },
      onError: () => toast.error("Ошибка при отвязке Telegram"),
    }),
  );

  const updateEmailMutation = useMutation(
    orpc.users.updateEmailSettings.mutationOptions(),
  );

  const updateTelegramMutation = useMutation(
    orpc.users.updateTelegramSettings.mutationOptions(),
  );

  const updateMaxMutation = useMutation(
    orpc.users.updateMaxSettings.mutationOptions(),
  );

  const updateReportParamsMutation = useMutation(
    orpc.users.updateReportParamsSettings.mutationOptions(),
  );

  const updateReportManagedUsersMutation = useMutation(
    orpc.users.updateReportManagedUsersSettings.mutationOptions(),
  );

  const sendTestTelegramTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const sendTestTelegramMessageRef = useRef("");
  const sendTestEmailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const sendTestEmailMessageRef = useRef("");
  const saveOperationKeyRef = useRef("");
  const [isSavingCombined, setIsSavingCombined] = useState(false);

  const sendTestMutation = useMutation(
    orpc.reports.sendTestTelegram.mutationOptions({
      onSuccess: (_, variables) => {
        const reportType = variables.reportType;
        const reportTypeLabel = getReportTypeLabel(reportType);
        toast.success(`${reportTypeLabel} отчёт отправлен в Telegram`);
        const scheduledMsg = `${reportTypeLabel} отчёт отправлен`;
        setSendTestMessage(scheduledMsg);
        sendTestTelegramMessageRef.current = scheduledMsg;
        if (sendTestTelegramTimeoutRef.current != null)
          clearTimeout(sendTestTelegramTimeoutRef.current);
        sendTestTelegramTimeoutRef.current = setTimeout(() => {
          if (sendTestTelegramMessageRef.current === scheduledMsg) {
            setSendTestMessage("");
            sendTestTelegramMessageRef.current = "";
          }
        }, 4000);
      },
      onError: (err) => {
        const msg =
          err instanceof Error ? err.message : "Не удалось отправить отчёт";
        toast.error(msg);
      },
    }),
  );

  const [sendTestMessage, setSendTestMessage] = useState("");
  const [sendTestEmailMessage, setSendTestEmailMessage] = useState("");

  const sendTestEmailMutation = useMutation(
    orpc.reports.sendTestEmail.mutationOptions({
      onSuccess: (_, variables) => {
        const reportTypeLabel = getReportTypeLabel(variables.reportType);
        const msg = `${reportTypeLabel} отчёт отправлен на email`;
        toast.success(msg);
        setSendTestEmailMessage(msg);
        sendTestEmailMessageRef.current = msg;
        if (sendTestEmailTimeoutRef.current != null)
          clearTimeout(sendTestEmailTimeoutRef.current);
        sendTestEmailTimeoutRef.current = setTimeout(() => {
          if (sendTestEmailMessageRef.current === msg) {
            setSendTestEmailMessage("");
            sendTestEmailMessageRef.current = "";
          }
        }, 4000);
      },
      onError: (err) => {
        const msg =
          err instanceof Error ? err.message : "Не удалось отправить отчёт";
        toast.error(msg);
      },
    }),
  );

  const handleSendTest = (reportType: ReportType) => {
    sendTestMutation.mutate({ reportType });
  };
  const handleSendTestEmail = (reportType: ReportType) => {
    sendTestEmailMutation.mutate({ reportType });
  };

  const handleTelegramConnect = () => {
    telegramAuthUrlMutation.mutate({ user_id: userId });
  };

  const handleTelegramDisconnect = () => {
    disconnectTelegramMutation.mutate({ user_id: userId });
  };

  const performUpdates = async ({
    run,
    successMessage,
    errorMessage,
    invalidateScheduleAfter = false,
  }: {
    run: () => Promise<void>;
    successMessage: string;
    errorMessage: string;
    invalidateScheduleAfter?: boolean;
  }) => {
    const operationKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;
    saveOperationKeyRef.current = operationKey;
    setIsSavingCombined(true);
    try {
      await run();
      toast.success(successMessage);
      invalidateUser();
      if (invalidateScheduleAfter) invalidateSchedule();
    } catch (err) {
      handleMutationError(err, errorMessage);
    } finally {
      if (saveOperationKeyRef.current === operationKey) {
        setIsSavingCombined(false);
      }
    }
  };

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
          updateReportParamsMutation.mutateAsync({
            user_id: userId,
            data: {
              reportIncludeCallSummaries: form.reportIncludeCallSummaries,
              reportDetailed: form.reportDetailed,
              reportIncludeAvgValue: form.reportIncludeAvgValue,
              reportIncludeAvgRating: form.reportIncludeAvgRating,
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
        await Promise.all([
          updateTelegramMutation.mutateAsync({
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
          }),
          updateReportParamsMutation.mutateAsync({
            user_id: userId,
            data: {
              reportIncludeCallSummaries: form.reportIncludeCallSummaries,
              reportDetailed: form.reportDetailed,
              reportIncludeAvgValue: form.reportIncludeAvgValue,
              reportIncludeAvgRating: form.reportIncludeAvgRating,
            },
          }),
        ]);
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
          updateReportParamsMutation.mutateAsync({
            user_id: userId,
            data: {
              reportIncludeCallSummaries: form.reportIncludeCallSummaries,
              reportDetailed: form.reportDetailed,
              reportIncludeAvgValue: form.reportIncludeAvgValue,
              reportIncludeAvgRating: form.reportIncludeAvgRating,
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

  const toNonNegInt = (value: string) => {
    const n = Number(value);
    if (!Number.isFinite(n) || Number.isNaN(n)) return 0;
    return Math.max(0, Math.trunc(n));
  };

  const handleSaveParams = async () => {
    await performUpdates({
      successMessage: "Параметры отчетов сохранены",
      errorMessage: "Не удалось сохранить параметры отчетов",
      run: async () => {
        await updateReportParamsMutation.mutateAsync({
          user_id: userId,
          data: {
            reportIncludeCallSummaries: form.reportIncludeCallSummaries,
            reportDetailed: form.reportDetailed,
            reportIncludeAvgValue: form.reportIncludeAvgValue,
            reportIncludeAvgRating: form.reportIncludeAvgRating,

            filterExcludeAnsweringMachine: form.filterExcludeAnsweringMachine,
            filterMinDuration: toNonNegInt(form.filterMinDuration),
            filterMinReplicas: toNonNegInt(form.filterMinReplicas),

            kpiBaseSalary: toNonNegInt(form.kpiBaseSalary),
            kpiTargetBonus: toNonNegInt(form.kpiTargetBonus),
            kpiTargetTalkTimeMinutes: toNonNegInt(
              form.kpiTargetTalkTimeMinutes,
            ),
          },
        });
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
          />
          <MaxReportSection
            form={form}
            setForm={setForm}
            isAdmin={isAdmin}
            saving={isSavingCombined || updateMaxMutation.isPending}
            onSave={handleSaveMax}
          />
          <ReportParamsSection
            form={form}
            setForm={setForm}
            saving={isSavingCombined || updateReportParamsMutation.isPending}
            onSave={handleSaveParams}
          />
          {isAdmin && (
            <ManagedUsersSection
              form={form}
              setForm={setForm}
              user={{ id: String(user.id) }}
              allUsers={allUsers}
              saving={
                isSavingCombined || updateReportManagedUsersMutation.isPending
              }
              onSave={handleSaveManagedUsers}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
