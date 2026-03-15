import { Button, Input } from "@calls/ui";
import type React from "react";

interface TelegramSectionProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  isAdmin: boolean;
  sendTestLoading: boolean;
  sendTestMessage: string;
  onSendTest: () => void;
}

export function TelegramReportSection({
  form,
  setForm,
  isAdmin,
  sendTestLoading,
  sendTestMessage,
  onSendTest,
}: TelegramSectionProps) {
  const canSendTest = form.telegramChatId?.trim() && !sendTestLoading;

  return (
    <div className="p-4 bg-[#f5f7fa] rounded-lg">
      <h4 className="m-0 mb-3 text-sm font-bold">Telegram Отчеты</h4>
      <div className="mb-3">
        <label className="block mb-1 text-[13px] font-semibold">
          Telegram Chat ID
        </label>
        <Input
          type="text"
          value={form.telegramChatId}
          onChange={(e) =>
            setForm((f: any) => ({
              ...f,
              telegramChatId: e.target.value,
            }))
          }
          className="w-full py-2 px-3 border border-[#ddd] rounded-md"
          placeholder="Напишите боту /start чтобы узнать ID"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.telegram_daily_report}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                telegram_daily_report: e.target.checked,
              }))
            }
          />{" "}
          Ежедневный отчет
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.telegram_weekly_report}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                telegram_weekly_report: e.target.checked,
              }))
            }
          />{" "}
          Еженедельный отчет
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.telegram_monthly_report}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                telegram_monthly_report: e.target.checked,
              }))
            }
          />{" "}
          Ежемесячный отчет
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.telegram_skip_weekends}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                telegram_skip_weekends: e.target.checked,
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
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
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
            value={form.report_daily_time}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                report_daily_time: e.target.value,
              }))
            }
            className="py-1 rounded border border-[#ddd]"
          />
        </label>
        <label className="text-xs">
          Еженедельно:{" "}
          <select
            value={form.report_weekly_day}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                report_weekly_day: e.target.value,
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
            value={form.report_weekly_time}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                report_weekly_time: e.target.value,
              }))
            }
            className="py-1 rounded border border-[#ddd]"
          />
        </label>
        <label className="text-xs">
          Ежемесячно:{" "}
          <select
            value={form.report_monthly_day}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                report_monthly_day: e.target.value,
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
            value={form.report_monthly_time}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                report_monthly_time: e.target.value,
              }))
            }
            className="py-1 rounded border border-[#ddd]"
          />
        </label>
      </div>
    </div>
  );
}
