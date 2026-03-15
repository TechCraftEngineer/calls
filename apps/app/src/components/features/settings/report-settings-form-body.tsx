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
