import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  toast,
} from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { User } from "@/lib/auth";
import { useORPC } from "@/orpc/react";
import {
  EmailReportSection,
  ManagedUsersSection,
  MaxReportSection,
  ReportParamsSection,
  TelegramReportSection,
} from "./report-settings";
import type {
  ReportSettingsForm,
  ReportSettingsUserOption,
} from "./report-settings-types";
import type { ReportType } from "./types";

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
  const queryClient = useQueryClient();
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
  const [sendTestReportType, setSendTestReportType] =
    useState<ReportType | null>(null);

  const sendTestMutation = useMutation(
    orpc.reports.sendTestTelegram.mutationOptions({
      onSuccess: (_, variables) => {
        const reportType = variables.reportType;
        const reportTypeLabel =
          reportType === "daily"
            ? "Ежедневный"
            : reportType === "weekly"
              ? "Еженедельный"
              : "Ежемесячный";
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
          err instanceof Error
            ? err.message
            : "Не удалось отправить. Укажите Telegram Chat ID в настройках отчётов.";
        toast.error(msg);
        setSendTestMessage(msg);
        sendTestMessageRef.current = msg;
      },
    }),
  );

  const [sendTestMessage, setSendTestMessage] = useState("");
  const [checkConnectionLoading, setCheckConnectionLoading] = useState(false);

  useEffect(
    () => () => {
      if (sendTestTimeoutRef.current != null) {
        clearTimeout(sendTestTimeoutRef.current);
        sendTestTimeoutRef.current = null;
      }
    },
    [],
  );

  const handleConnectTelegram = () => {
    telegramAuthUrlMutation.mutate({ user_id: userId });
  };

  const handleDisconnectTelegram = () => {
    if (!confirm("Отвязать Telegram аккаунт?")) return;
    disconnectTelegramMutation.mutate({ user_id: userId });
  };

  const handleCheckConnection = async () => {
    setCheckConnectionLoading(true);
    try {
      const result = await queryClient.fetchQuery(
        orpc.users.get.queryOptions({ input: { user_id: userId } }),
      );
      const chatId =
        (result as { telegramChatId?: string })?.telegramChatId ?? "";
      setForm((f) => ({ ...f, telegramChatId: chatId }));
      if (chatId) {
        toast.success("Telegram подключён");
      } else {
        toast.info(
          "Подключение не обнаружено. Нажмите «Подключить Telegram», откройте ссылку и отправьте боту /start",
        );
      }
    } catch {
      toast.error("Ошибка при проверке подключения");
    } finally {
      setCheckConnectionLoading(false);
    }
  };

  const handleSendTest = (reportType: ReportType) => {
    setSendTestReportType(reportType);
    setSendTestMessage("");
    sendTestMutation.mutate(
      { reportType },
      {
        onSettled: () => {
          setSendTestReportType(null);
        },
      },
    );
  };

  const maxAuthUrlMutation = useMutation(
    orpc.users.maxAuthUrl.mutationOptions({
      onSuccess: (res: { manual_instruction?: string; token?: string }) => {
        if (res.manual_instruction) {
          const cmd =
            res.manual_instruction.split(": ")[1] ?? res.manual_instruction;
          toast.info(`Для подключения отправьте боту команду:\n${cmd}`);
        }
      },
      onError: () => toast.error("Ошибка при создании ссылки для MAX"),
    }),
  );

  const disconnectMaxMutation = useMutation(
    orpc.users.disconnectMax.mutationOptions({
      onSuccess: () => {
        setForm((f) => ({ ...f, maxChatId: "" }));
        toast.success("MAX отвязан");
      },
      onError: () => toast.error("Ошибка при отвязке MAX"),
    }),
  );

  const handleConnectMax = () => {
    maxAuthUrlMutation.mutate({ user_id: userId });
  };

  const handleDisconnectMax = () => {
    if (!confirm("Отвязать MAX аккаунт?")) return;
    disconnectMaxMutation.mutate({ user_id: userId });
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Мои настройки отчетов</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
            <TelegramReportSection
              form={form}
              setForm={setForm}
              isAdmin={isAdmin}
              sendTestLoading={sendTestMutation.isPending}
              sendTestReportType={sendTestReportType}
              sendTestMessage={sendTestMessage}
              onSendTest={handleSendTest}
              user={user}
              onConnect={handleConnectTelegram}
              onDisconnect={handleDisconnectTelegram}
              onCheckConnection={handleCheckConnection}
              connectLoading={telegramAuthUrlMutation.isPending}
              disconnectLoading={disconnectTelegramMutation.isPending}
              checkConnectionLoading={checkConnectionLoading}
            />

            <MaxReportSection
              form={form}
              setForm={setForm}
              isAdmin={isAdmin}
              user={user}
              onConnect={handleConnectMax}
              onDisconnect={handleDisconnectMax}
              connectLoading={maxAuthUrlMutation.isPending}
              disconnectLoading={disconnectMaxMutation.isPending}
            />

            {isAdmin && (
              <ManagedUsersSection
                form={form}
                setForm={setForm}
                user={user}
                allUsers={allUsers}
              />
            )}

            <EmailReportSection form={form} setForm={setForm} />

            <ReportParamsSection form={form} setForm={setForm} />
          </div>

          <div className="mt-6 flex items-center gap-4">
            <Button type="submit" variant="default" disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить настройки"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
