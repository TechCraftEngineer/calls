import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  Field,
  Input,
  Label,
} from "@calls/ui";
import type React from "react";
import type { ReportSettingsForm } from "./report-settings-types";

interface ParamsSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  onSave: () => void;
  saving: boolean;
}

export function ReportParamsSection({ form, setForm, onSave, saving }: ParamsSectionProps) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="px-4 pb-0">
        <CardDescription>Настройки KPI для расчетов в отчетах.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field orientation="vertical" className="items-start gap-2">
            <Label className="text-sm font-normal">Базовый оклад (₽)</Label>
            <Input
              type="number"
              value={form.kpiBaseSalary}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kpiBaseSalary: e.target.value,
                }))
              }
              className="h-8"
            />
          </Field>
          <Field orientation="vertical" className="items-start gap-2">
            <Label className="text-sm font-normal">Целевой бонус (₽)</Label>
            <Input
              type="number"
              value={form.kpiTargetBonus}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kpiTargetBonus: e.target.value,
                }))
              }
              className="h-8"
            />
          </Field>
          <Field orientation="vertical" className="items-start gap-2">
            <Label className="text-sm font-normal">Целевое время разговоров (мин)</Label>
            <Input
              type="number"
              value={form.kpiTargetTalkTimeMinutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kpiTargetTalkTimeMinutes: e.target.value,
                }))
              }
              className="h-8"
            />
          </Field>
        </div>
      </CardContent>
      <CardFooter className="px-4 pt-0 flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </CardFooter>
    </Card>
  );
}
