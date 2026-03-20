import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  Input,
  Label,
  Separator,
} from "@calls/ui";
import type React from "react";
import type { ReportSettingsForm } from "./report-settings-types";

interface ParamsSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  onSave: () => void;
  saving: boolean;
}

export function ReportParamsSection({
  form,
  setForm,
  onSave,
  saving,
}: ParamsSectionProps) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base">Параметры отчетов</CardTitle>
        <CardDescription>
          Формат отчёта + KPI и фильтры. После изменений нажмите «Сохранить».
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={form.reportDetailed}
              onCheckedChange={(checked) =>
                setForm((f) => ({
                  ...f,
                  reportDetailed: checked === true,
                }))
              }
            />
            Подробный формат
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={form.reportIncludeCallSummaries}
              onCheckedChange={(checked) =>
                setForm((f) => ({
                  ...f,
                  reportIncludeCallSummaries: checked === true,
                }))
              }
            />
            ИИ-саммари вызовов (Email)
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={form.reportIncludeAvgValue}
              onCheckedChange={(checked) =>
                setForm((f) => ({
                  ...f,
                  reportIncludeAvgValue: checked === true,
                }))
              }
            />
            Средняя сумма сделки
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={form.reportIncludeAvgRating}
              onCheckedChange={(checked) =>
                setForm((f) => ({
                  ...f,
                  reportIncludeAvgRating: checked === true,
                }))
              }
            />
            Средняя оценка качества
          </Label>
        </div>

        <KpiSettings form={form} setForm={setForm} />
        <FilterExclusions form={form} setForm={setForm} />
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

function KpiSettings({
  form,
  setForm,
}: {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
}) {
  return (
    <div className="mt-4 pt-4">
      <Separator className="mb-4" />
      <h4 className="mb-3 text-sm font-bold">Настройки KPI</h4>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label className="mb-1 block text-sm font-normal">
            Базовый оклад (₽)
          </Label>
          <Input
            type="number"
            min={0}
            value={form.kpiBaseSalary}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                kpiBaseSalary: e.target.value,
              }))
            }
            className="h-8 tabular-nums"
          />
        </div>

        <div>
          <Label className="mb-1 block text-sm font-normal">
            Целевой бонус (₽)
          </Label>
          <Input
            type="number"
            min={0}
            value={form.kpiTargetBonus}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                kpiTargetBonus: e.target.value,
              }))
            }
            className="h-8 tabular-nums"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <Label className="mb-1 block text-sm font-normal">
            Целевое время разговоров в месяц (мин)
          </Label>
          <Input
            type="number"
            min={0}
            value={form.kpiTargetTalkTimeMinutes}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                kpiTargetTalkTimeMinutes: e.target.value,
              }))
            }
            className="h-8 tabular-nums"
          />
        </div>
      </div>
    </div>
  );
}

function FilterExclusions({
  form,
  setForm,
}: {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
}) {
  return (
    <div className="mt-4 pt-4">
      <Separator className="mb-4" />
      <h4 className="mb-3 text-sm font-bold">Исключения (фильтры)</h4>
      <Label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-normal">
        <Checkbox
          checked={form.filterExcludeAnsweringMachine}
          onCheckedChange={(checked) =>
            setForm((f) => ({
              ...f,
              filterExcludeAnsweringMachine: checked === true,
            }))
          }
        />
        Без автоответчиков
      </Label>
      <div className="flex flex-wrap items-center gap-3">
        <Field orientation="horizontal" className="items-center gap-2">
          <Label className="text-sm font-normal">Короче (сек):</Label>
          <Input
            type="number"
            value={form.filterMinDuration}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                filterMinDuration: e.target.value,
              }))
            }
            className="h-8 w-17.5"
          />
        </Field>
        <Field orientation="horizontal" className="items-center gap-2">
          <Label className="text-sm font-normal">Мин. реплик:</Label>
          <Input
            type="number"
            value={form.filterMinReplicas}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                filterMinReplicas: e.target.value,
              }))
            }
            className="h-8 w-17.5"
          />
        </Field>
      </div>
    </div>
  );
}
