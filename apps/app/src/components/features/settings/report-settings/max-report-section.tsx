import { Label } from "@calls/ui";
import type React from "react";
import type { ReportSettingsForm } from "./report-settings-types";

interface MaxReportSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  isAdmin: boolean;
  saving: boolean;
}

export default function MaxReportSection({
  form,
  setForm,
  isAdmin,
  saving,
}: MaxReportSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="max-daily-report">
        <input
          id="max-daily-report"
          name="maxDailyReport"
          type="checkbox"
          checked={form.maxDailyReport}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              maxDailyReport: e.target.checked,
            }))
          }
          disabled={!isAdmin || saving}
          className="mr-2"
          aria-describedby={["max-daily-report-help", !isAdmin ? "max-daily-report-error" : null]
            .filter(Boolean)
            .join(" ")}
        />
        Ограничить генерацию отчетов
      </Label>
      <p id="max-daily-report-help" className="text-sm text-muted-foreground">
        Включите, чтобы ограничить количество генерируемых отчетов
      </p>
      {!isAdmin && (
        <p id="max-daily-report-error" className="text-sm text-destructive">
          Только администраторы могут изменять эту настройку
        </p>
      )}
    </div>
  );
}
