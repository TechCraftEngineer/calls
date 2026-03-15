import { Button, Card, CardContent, CardHeader, toast } from "@calls/ui";
import type React from "react";
import { useState } from "react";
import api from "@/lib/api";
import type { User } from "@/lib/auth";
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
  const [sendTestLoading, setSendTestLoading] = useState(false);
  const [sendTestMessage, setSendTestMessage] = useState("");
  const [connectTelegramLoading, setConnectTelegramLoading] = useState(false);
  const [disconnectTelegramLoading, setDisconnectTelegramLoading] =
    useState(false);
  const [checkConnectionLoading, setCheckConnectionLoading] = useState(false);

  const handleConnectTelegram = async () => {
    setConnectTelegramLoading(true);
    try {
      const res = await api.users.telegramAuthUrl({ user_id: String(user.id) });
      if (res?.url) {
        window.open(res.url, "_blank");
        toast.success(
          "Откройте Telegram и нажмите «Старт» в чате с ботом. Затем нажмите «Проверить подключение».",
        );
      } else {
        toast.error("Не удалось получить ссылку для подключения");
      }
    } catch {
      toast.error("Ошибка при создании ссылки для Telegram");
    } finally {
      setConnectTelegramLoading(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!confirm("Отвязать Telegram аккаунт?")) return;
    setDisconnectTelegramLoading(true);
    try {
      await api.users.disconnectTelegram({ user_id: String(user.id) });
      setForm((f: any) => ({ ...f, telegramChatId: "" }));
      toast.success("Telegram отвязан");
    } catch {
      toast.error("Ошибка при отвязке Telegram");
    } finally {
      setDisconnectTelegramLoading(false);
    }
  };

  const handleCheckConnection = async () => {
    setCheckConnectionLoading(true);
    try {
      const u = await api.users.get({ user_id: String(user.id) });
      const chatId = (u as { telegramChatId?: string })?.telegramChatId ?? "";
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

  const handleSendTest = async () => {
    setSendTestMessage("");
    setSendTestLoading(true);
    try {
      await api.reports.sendTestTelegram();
      toast.success("Тестовый отчёт отправлен в Telegram");
    } catch (err: unknown) {
      const d = err instanceof Error ? err.message : null;
      const msg =
        typeof d === "string"
          ? d
          : "Не удалось отправить. Укажите Telegram Chat ID в настройках отчётов.";
      toast.error(msg);
      setSendTestMessage(msg);
    } finally {
      setSendTestLoading(false);
    }
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
              sendTestLoading={sendTestLoading}
              sendTestMessage={sendTestMessage}
              onSendTest={handleSendTest}
              user={user}
              onConnect={handleConnectTelegram}
              onDisconnect={handleDisconnectTelegram}
              onCheckConnection={handleCheckConnection}
              connectLoading={connectTelegramLoading}
              disconnectLoading={disconnectTelegramLoading}
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
