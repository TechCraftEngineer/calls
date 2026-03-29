import { Input, Label } from "@calls/ui";
import type React from "react";
import type { ReportSettingsForm } from "./report-settings-types";

interface MaxReportSectionProps {
  maxReports: string;
  onChange: (maxReports: string) => void;
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  isAdmin: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
}

export default function MaxReportSection({
  maxReports,
  onChange,
  form,
  setForm,
  isAdmin,
  saving,
  onSave,
}: MaxReportSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="max-reports">Максимальное количество отчетов</Label>
      <Input
        id="max-reports"
        name="maxReports"
        type="number"
        min="1"
        max="100"
        value={maxReports}
        onChange={(e) => onChange(e.target.value)}
        placeholder="10"
        autoComplete="off"
        inputMode="numeric"
      />
    </div>
  );
}
