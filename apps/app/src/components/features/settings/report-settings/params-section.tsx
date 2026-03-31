import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
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

export function ReportParamsSection({ form, setForm, onSave, saving }: ParamsSectionProps) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="px-4 pb-0">
        <CardDescription>Дополнительные параметры фильтров для расчетов в отчетах.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
