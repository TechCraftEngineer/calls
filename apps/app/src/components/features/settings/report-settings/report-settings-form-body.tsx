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
    orpc.users.updateEmailSettings.mutationOptions({
      onSuccess: () => {
        toast.success("Настройки email сохранены");
        invalidateUser();
      },
      onError: (err) =>
        handleMutationError(err, "Не удалось сохранить настройки email"),
    }),
  );

  const updateTelegramMutation = useMutation(
    orpc.users.updateTelegramSettings.mutationOptions({
      onSuccess: () => {
        toast.success("Настройки Telegram сохранены");
        invalidateUser();
        invalidateSchedule();
      },
      onError: (err) =>
        handleMutationError(err, "Не удалось сохранить настройки Telegram"),
    }),
  );

  const updateMaxMutation = useMutation(
    orpc.users.updateMaxSettings.mutationOptions({
      onSuccess: () => {
        toast.success("Настройки MAX сохранены");
        invalidateUser();
      },
      onError: (err) =>
        handleMutationError(err, "Не удалось сохранить настройки MAX"),
    }),
  );

  const updateReportParamsMutation = useMutation(
    orpc.users.updateReportParamsSettings.mutationOptions({
      onSuccess: () => {
        toast.success("Параметры отчетов сохранены");
        invalidateUser();
      },
      onError: (err) =>
        handleMutationError(err, "Не удалось сохранить параметры отчетов"),
    }),
  );

  const updateReportManagedUsersMutation = useMutation(
    orpc.users.updateReportManagedUsersSettings.mutationOptions({
      onSuccess: () => {
        toast.success("Сводные менеджеры сохранены");
        invalidateUser();
      },
      onError: (err) =>
        handleMutationError(
          err,
          "Не удалось сохранить сводные настройки менеджеров",
        ),
    }),
  );

  const sendTestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTestMessageRef = useRef("");
  const sendTestEmailMessageRef = useRef("");

  const sendTestMutation = useMutation(
    orpc.reports.sendTestTelegram.mutationOptions({
      onSuccess: (_, variables) => {
        const reportType = variables.reportType;
        const reportTypeLabel = getReportTypeLabel(reportType);
        toast.success(`${reportTypeLabel} отчёт отправлен в Telegram`);
        const scheduledMsg = `${reportTypeLabel} отчёт отправлен`;
        setSendTestMessage(scheduledMsg);
        sendTestMessageRef.current = scheduledMsg;
        if (sendTestTimeoutRef.current != null)
          clearTimeout(sendTestTimeoutRef.current);
        sendTestTimeoutRef.current = setTimeout(() => {
          if (sendTestMessageRef.current === scheduledMsg) {
            setSendTestMessage("");
            sendTestMessageRef.current = "";
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
        if (sendTestTimeoutRef.current != null)
          clearTimeout(sendTestTimeoutRef.current);
        sendTestTimeoutRef.current = setTimeout(() => {
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
  const handleSendTestMax = (_reportType: ReportType) => {
    toast.error(
      "Мгновенная отправка в MAX будет доступна после интеграции канала",
    );
  };

  const handleTelegramConnect = () => {
    telegramAuthUrlMutation.mutate({ user_id: userId });
  };

  const handleTelegramDisconnect = () => {
    disconnectTelegramMutation.mutate({ user_id: userId });
  };

  const handleSaveEmail = () => {
    const email = form.email.trim();
    updateEmailMutation.mutate({
      user_id: userId,
      data: {
        email: email ? email : null,
        emailDailyReport: form.emailDailyReport,
        emailWeeklyReport: form.emailWeeklyReport,
        emailMonthlyReport: form.emailMonthlyReport,
      },
    });
    updateReportParamsMutation.mutate({
      user_id: userId,
      data: {
        reportIncludeCallSummaries: form.reportIncludeCallSummaries,
        reportDetailed: form.reportDetailed,
        reportIncludeAvgValue: form.reportIncludeAvgValue,
        reportIncludeAvgRating: form.reportIncludeAvgRating,
      },
    });
    if (isAdmin) {
      updateTelegramMutation.mutate({
        user_id: userId,
        data: {
          reportDailyTime: form.reportDailyTime,
          reportWeeklyDay: form.reportWeeklyDay as
            | "sun"
            | "mon"
            | "tue"
            | "wed"
            | "thu"
            | "fri"
            | "sat",
          reportWeeklyTime: form.reportWeeklyTime,
          reportMonthlyDay: form.reportMonthlyDay,
          reportMonthlyTime: form.reportMonthlyTime,
        },
      });
    }
  };

  const handleSaveTelegram = () => {
    const telegramChatId = form.telegramChatId.trim();
    const reportWeeklyDay = form.reportWeeklyDay as
      | "sun"
      | "mon"
      | "tue"
      | "wed"
      | "thu"
      | "fri"
      | "sat";
    updateTelegramMutation.mutate({
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
    updateReportParamsMutation.mutate({
      user_id: userId,
      data: {
        reportIncludeCallSummaries: form.reportIncludeCallSummaries,
        reportDetailed: form.reportDetailed,
        reportIncludeAvgValue: form.reportIncludeAvgValue,
        reportIncludeAvgRating: form.reportIncludeAvgRating,
      },
    });
  };

  const handleSaveMax = () => {
    const maxChatId = form.maxChatId.trim();
    updateMaxMutation.mutate({
      user_id: userId,
      data: {
        maxChatId: maxChatId ? maxChatId : null,
        maxDailyReport: form.maxDailyReport,
        maxManagerReport: form.maxManagerReport,
      },
    });
    updateReportParamsMutation.mutate({
      user_id: userId,
      data: {
        reportIncludeCallSummaries: form.reportIncludeCallSummaries,
        reportDetailed: form.reportDetailed,
        reportIncludeAvgValue: form.reportIncludeAvgValue,
        reportIncludeAvgRating: form.reportIncludeAvgRating,
      },
    });
    if (isAdmin) {
      updateTelegramMutation.mutate({
        user_id: userId,
        data: {
          reportDailyTime: form.reportDailyTime,
          reportWeeklyDay: form.reportWeeklyDay as
            | "sun"
            | "mon"
            | "tue"
            | "wed"
            | "thu"
            | "fri"
            | "sat",
          reportWeeklyTime: form.reportWeeklyTime,
          reportMonthlyDay: form.reportMonthlyDay,
          reportMonthlyTime: form.reportMonthlyTime,
        },
      });
    }
  };

  const toNonNegInt = (value: string) => {
    const n = Number(value);
    if (!Number.isFinite(n) || Number.isNaN(n)) return 0;
    return Math.max(0, Math.trunc(n));
  };

  const handleSaveParams = () => {
    updateReportParamsMutation.mutate({
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
        kpiTargetTalkTimeMinutes: toNonNegInt(form.kpiTargetTalkTimeMinutes),
      },
    });
  };

  const handleSaveManagedUsers = () => {
    updateReportManagedUsersMutation.mutate({
      user_id: userId,
      data: {
        reportManagedUserIds: form.reportManagedUserIds ?? [],
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
            saving={updateEmailMutation.isPending}
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
            saving={updateTelegramMutation.isPending}
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
            saving={updateMaxMutation.isPending}
            onSave={handleSaveMax}
            onSendTest={handleSendTestMax}
            sendTestLoading={false}
            sendTestSuccess={false}
            sendTestReportType={null}
            sendTestMessage=""
          />
          <ReportParamsSection
            form={form}
            setForm={setForm}
            saving={updateReportParamsMutation.isPending}
            onSave={handleSaveParams}
          />
          {isAdmin && (
            <ManagedUsersSection
              form={form}
              setForm={setForm}
              user={{ id: String(user.id) }}
              allUsers={allUsers}
              saving={updateReportManagedUsersMutation.isPending}
              onSave={handleSaveManagedUsers}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
