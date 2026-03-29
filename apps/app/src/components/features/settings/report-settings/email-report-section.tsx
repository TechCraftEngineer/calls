import { Input, Label } from "@calls/ui";
import type React from "react";

interface EmailReportSectionProps {
  email: string;
  onChange: (email: string) => void;
}

export default function EmailReportSection({
  email,
  onChange,
}: EmailReportSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="report-email">Email для отправки отчетов</Label>
      <Input
        id="report-email"
        name="reportEmail"
        type="email"
        value={email}
        onChange={(e) => onChange(e.target.value)}
        placeholder="reports@example.com…"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
      />
    </div>
  );
}
