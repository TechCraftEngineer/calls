import { Button, Input } from "@calls/ui";
import type React from "react";
import type { User } from "@/lib/auth";
import type { ReportSettingsForm } from "../report-settings-types";

interface TelegramSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  isAdmin: boolean;
  sendTestLoading: boolean;
  sendTestMessage: string;
  onSendTest: () => void;
  user?: User;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onCheckConnection?: () => void;
  connectLoading?: boolean;
  disconnectLoading?: boolean;
  checkConnectionLoading?: boolean;
}

export function TelegramReportSection({
  form,
  setForm,
  isAdmin,
  sendTestLoading,
  sendTestMessage,
  onSendTest,
  user,
  onConnect,
  onDisconnect,
  onCheckConnection,
  connectLoading,
  disconnectLoading,
  checkConnectionLoading,
}: TelegramSectionProps) {
  const canSendTest = form.telegramChatId?.trim() && !sendTestLoading;
  const hasTelegram = !!form.telegramChatId?.trim();

  return (
    <div className="p-4 bg-[#f5f7fa] rounded-lg">
      <h4 className="m-0 mb-3 text-sm font-bold">Telegram Отчеты</h4>
      <div className="mb-3">
        <label className="block mb-1 text-[13px] font-semibold">
          Telegram Chat ID
        </label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={form.telegramChatId}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                telegramChatId: e.target.value,
              }))
            }
            className="flex-1 py-2 px-3 border border-[#ddd] rounded-md"
            placeholder="Нажмите «Подключить Telegram» или введите ID вручную"
          />
          {hasTelegram && onDisconnect && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              disabled={disconnectLoading}
              className="text-[13px] text-[#FF5252] border-[#FF5252] hover:bg-red-50 hover:text-[#FF5252] shrink-0"
            >
              {disconnectLoading ? "…" : "Отвязать"}
            </Button>
          )}
        </div>
        {user && onConnect && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {!hasTelegram ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onConnect}
                  disabled={connectLoading}
                  className="text-[13px] text-[#0088cc] border-[#0088cc] hover:bg-blue-50 hover:text-[#0088cc]"
                >
                  {connectLoading ? (
                    "…"
                  ) : (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="mr-1 inline"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.48-.94-2.4-1.54-1.06-.7-.37-1.09.23-1.72.16-.16 2.87-2.63 2.92-2.85.01-.03.01-.14-.06-.2-.06-.05-.16-.03-.24-.01-.34.08-5.34 3.45-5.56 3.6-.32.22-.6.33-.85.33-.28-.01-.81-.26-1.2-.56-.48-.38-.86-.58-.82-1.23.02-.34.49-.69 1.28-1.05 5.03-2.18 8.38-3.62 10.04-4.3 2.8-1.16 3.38-1.36 3.76-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z" />
                      </svg>
                      Подключить Telegram
                    </>
                  )}
                </Button>
                {onCheckConnection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCheckConnection}
                    disabled={checkConnectionLoading}
                  >
                    {checkConnectionLoading ? "…" : "Проверить подключение"}
                  </Button>
                )}
              </>
            ) : (
              onCheckConnection && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCheckConnection}
                  disabled={checkConnectionLoading}
                >
                  {checkConnectionLoading ? "…" : "Проверить подключение"}
                </Button>
              )
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.telegramDailyReport}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                telegramDailyReport: e.target.checked,
              }))
            }
          />{" "}
          Ежедневный отчет
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.telegramWeeklyReport}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                telegramWeeklyReport: e.target.checked,
              }))
            }
          />{" "}
          Еженедельный отчет
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.telegramMonthlyReport}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                telegramMonthlyReport: e.target.checked,
              }))
            }
          />{" "}
          Ежемесячный отчет
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.telegramSkipWeekends}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                telegramSkipWeekends: e.target.checked,
              }))
            }
          />{" "}
          Не отправлять отчёты в Telegram в выходные
        </label>
      </div>
      <div className="mt-3">
        <Button
          type="button"
          variant={canSendTest ? "success" : "secondary"}
          size="sm"
          disabled={!form.telegramChatId?.trim() || sendTestLoading}
          onClick={onSendTest}
        >
          {sendTestLoading ? "Отправка…" : "Отправить отчёт в Telegram"}
        </Button>
        {sendTestMessage && (
          <span
            className={`ml-3 text-[13px] ${
              sendTestMessage.includes("отправлен")
                ? "text-[#4CAF50]"
                : "text-[#FF5252]"
            }`}
          >
            {sendTestMessage}
          </span>
        )}
      </div>
      {isAdmin && <ReportTimeSettings form={form} setForm={setForm} />}
    </div>
  );
}

function ReportTimeSettings({
  form,
  setForm,
}: {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
}) {
  return (
    <div className="mt-4 border-t border-[#ddd] pt-3">
      <h4 className="m-0 mb-2 text-[13px] font-bold">
        Время отправки (для всех)
      </h4>
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-xs">
          Ежедневно:{" "}
          <Input
            type="time"
            value={form.reportDailyTime}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                reportDailyTime: e.target.value,
              }))
            }
            className="py-1 rounded border border-[#ddd]"
          />
        </label>
        <label className="text-xs">
          Еженедельно:{" "}
          <select
            value={form.reportWeeklyDay}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                reportWeeklyDay: e.target.value,
              }))
            }
            className="py-1 rounded border border-[#ddd]"
          >
            {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>{" "}
          <Input
            type="time"
            value={form.reportWeeklyTime}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                reportWeeklyTime: e.target.value,
              }))
            }
            className="py-1 rounded border border-[#ddd]"
          />
        </label>
        <label className="text-xs">
          Ежемесячно:{" "}
          <select
            value={form.reportMonthlyDay}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                reportMonthlyDay: e.target.value,
              }))
            }
            className="py-1 rounded border border-[#ddd]"
          >
            <option value="last">Последний день</option>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>{" "}
          <Input
            type="time"
            value={form.reportMonthlyTime}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                reportMonthlyTime: e.target.value,
              }))
            }
            className="py-1 rounded border border-[#ddd]"
          />
        </label>
      </div>
    </div>
  );
}
