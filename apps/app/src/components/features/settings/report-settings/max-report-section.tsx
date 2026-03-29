import { Input, Label } from "@calls/ui";

interface MaxReportSectionProps {
  maxReports: number;
  onChange: (maxReports: number) => void;
}

export default function MaxReportSection({ maxReports, onChange }: MaxReportSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="max-reports">Максимальное количество отчетов</Label>
      <Input
        id="max-reports"
        type="number"
        min="1"
        max="100"
        value={maxReports}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder="10"
      />
    </div>
  );
}
