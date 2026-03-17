import { Checkbox, Field, FieldLabel, Input, Label } from "@calls/ui";
import type React from "react";
import type { ReportSettingsForm } from "../report-settings-types";

interface EmailSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
}

export function EmailReportSection({ form, setForm }: EmailSectionProps) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <h4 className="mb-3 text-sm font-bold">Email Отчеты</h4>
      <Field className="mb-3">
        <FieldLabel asChild>
          <Label>Email адрес</Label>
        </FieldLabel>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Ваш Email"
        />
      </Field>
      <div className="flex flex-col gap-2">
        <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={form.emailDailyReport}
            onCheckedChange={(checked) =>
              setForm((f) => ({
                ...f,
                emailDailyReport: checked === true,
              }))
            }
          />
          Ежедневный отчет
        </Label>
        <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={form.emailWeeklyReport}
            onCheckedChange={(checked) =>
              setForm((f) => ({
                ...f,
                emailWeeklyReport: checked === true,
              }))
            }
          />
          Еженедельный отчет
        </Label>
        <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={form.emailMonthlyReport}
            onCheckedChange={(checked) =>
              setForm((f) => ({
                ...f,
                emailMonthlyReport: checked === true,
              }))
            }
          />
          Ежемесячный отчет
        </Label>
      </div>
    </div>
  );
}
