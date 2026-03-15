import { Input } from "@calls/ui";
import type React from "react";

interface EmailSectionProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export function EmailReportSection({ form, setForm }: EmailSectionProps) {
  return (
    <div className="p-4 bg-[#f5f7fa] rounded-lg">
      <h4 className="m-0 mb-3 text-sm font-bold">Email Отчеты</h4>
      <div className="mb-3">
        <label className="block mb-1 text-[13px] font-semibold">
          Email адрес
        </label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) =>
            setForm((f: any) => ({ ...f, email: e.target.value }))
          }
          className="w-full py-2 px-3 border border-[#ddd] rounded-md"
          placeholder="Ваш Email"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.email_daily_report}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                email_daily_report: e.target.checked,
              }))
            }
          />{" "}
          Ежедневный отчет
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.email_weekly_report}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                email_weekly_report: e.target.checked,
              }))
            }
          />{" "}
          Еженедельный отчет
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.email_monthly_report}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                email_monthly_report: e.target.checked,
              }))
            }
          />{" "}
          Ежемесячный отчет
        </label>
      </div>
    </div>
  );
}
