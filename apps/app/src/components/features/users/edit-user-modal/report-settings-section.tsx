"use client";

import { Input } from "@calls/ui";
import type { EditUserForm } from "../types";

interface ReportSettingsSectionProps {
  form: EditUserForm;
  onFormChange: (updates: Partial<EditUserForm>) => void;
}

export function ReportSettingsSection({ form, onFormChange }: ReportSettingsSectionProps) {
  return (
    <>
      {/* Периодичность Telegram */}
      <div className="mb-4 p-4 bg-[#f5f7fa] rounded-lg">
        <h3 className="m-0 mb-3 text-sm font-bold">Периодичность Telegram отчетов</h3>
        <div className="flex flex-col gap-2">
          {(
            [
              ["telegramDailyReport", "Ежедневный отчет"],
              ["telegramWeeklyReport", "Еженедельный отчет"],
              ["telegramMonthlyReport", "Ежемесячный отчет"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => onFormChange({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Email Отчеты */}
      <div className="mb-4 p-4 bg-[#f5f7fa] rounded-lg">
        <h3 className="m-0 mb-3 text-sm font-bold">Email Отчеты</h3>
        <div className="mb-3">
          <label className="block mb-1 text-[13px] font-semibold">Email адрес</label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => onFormChange({ email: e.target.value })}
            className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
            placeholder="otchet@mail.com"
          />
        </div>
        <div className="flex flex-col gap-2">
          {(
            [
              ["emailDailyReport", "Ежедневный отчет"],
              ["emailWeeklyReport", "Еженедельный отчет"],
              ["emailMonthlyReport", "Ежемесячный отчет"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => onFormChange({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

    </>
  );
}
