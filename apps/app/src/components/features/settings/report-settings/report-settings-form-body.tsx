import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  toast,
} from "@calls/ui";
import { useMutation } from "@tanstack/react-query";
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
  handleSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  user: User;
  isAdmin: boolean;
  allUsers: ReportSettingsUserOption[];
}

export default function ReportSettingsFormBody({
  form,
  setForm,
  handleSubmit,
  saving,
  user,
  isAdmin,
  allUsers,
}: ReportSettingsFormBodyProps) {
  const orpc = useORPC();
  const userId = String(user.id);

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

  const sendTestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTestMessageRef = useRef("");

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

  const handleSendTest = (reportType: ReportType) => {
    sendTestMutation.mutate({ reportType });
  };

  const handleTelegramConnect = () => {
    telegramAuthUrlMutation.mutate({ user_id: userId });
  };

  const handleTelegramDisconnect = () => {
    disconnectTelegramMutation.mutate({ user_id: userId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Настройки отчётов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <EmailReportSection form={form} setForm={setForm} />
          <TelegramReportSection
            form={form}
            setForm={setForm}
            isAdmin={isAdmin}
            onConnect={handleTelegramConnect}
            onDisconnect={handleTelegramDisconnect}
            connecting={telegramAuthUrlMutation.isPending}
            disconnecting={disconnectTelegramMutation.isPending}
          />
          <MaxReportSection form={form} setForm={setForm} isAdmin={isAdmin} />
          <ReportParamsSection form={form} setForm={setForm} />
          {isAdmin && (
            <ManagedUsersSection
              form={form}
              setForm={setForm}
              user={{ id: String(user.id) }}
              allUsers={allUsers}
            />
          )}
        </CardContent>
      </Card>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить настройки"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSendTest("daily")}
          disabled={sendTestMutation.isPending}
        >
          {sendTestMutation.isPending
            ? "Отправка…"
            : "Отправить тестовый отчёт"}
        </Button>
        {sendTestMessage && (
          <span className="text-sm text-muted-foreground">
            {sendTestMessage}
          </span>
        )}
      </div>
    </form>
  );
}
