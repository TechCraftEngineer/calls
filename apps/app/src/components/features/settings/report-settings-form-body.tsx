import { Button, Card, CardContent, CardHeader, toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import type { User } from "@/lib/auth";
import { useORPC } from "@/orpc/react";
import {
  EmailReportSection,
  ManagedUsersSection,
  ReportParamsSection,
  TelegramReportSection,
} from "./report-settings";

interface ReportSettingsFormBodyProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  handleSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  user: User;
  isAdmin: boolean;
  allUsers: any[];
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
        setForm((f: any) => ({ ...f, telegramChatId: "" }));
        toast.success("Telegram отвязан");
      },
      onError: () => toast.error("Ошибка при отвязке Telegram"),
    }),
  );

  const sendTestMutation = useMutation(
    orpc.reports.sendTestTelegram.mutationOptions({
      onSuccess: () => toast.success("Тестовый отчёт отправлен в Telegram"),
      onError: (err) => {
        const msg =
          err instanceof Error
            ? err.message
            : "Не удалось отправить. Укажите Telegram Chat ID в настройках отчётов.";
        toast.error(msg);
        setSendTestMessage(msg);
      },
    }),
  );

  const [sendTestMessage, setSendTestMessage] = useState("");
  const [checkConnectionLoading, setCheckConnectionLoading] = useState(false);

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
      setForm((f: any) => ({ ...f, telegramChatId: chatId }));
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

  const handleSendTest = () => {
    setSendTestMessage("");
    sendTestMutation.mutate(undefined);
  };

  return (
    <Card className="card mt-6">
      <CardHeader className="p-0 pb-0">
        <h3 className="section-title mb-5">Мои настройки отчетов</h3>
      </CardHeader>
      <CardContent className="p-0 pt-0">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
            <TelegramReportSection
              form={form}
              setForm={setForm}
              isAdmin={isAdmin}
              sendTestLoading={sendTestMutation.isPending}
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
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить настройки"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
