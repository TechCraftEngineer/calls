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
  FieldLabel,
  Input,
  Label,
} from "@calls/ui";
import type React from "react";
import type { ReportSettingsForm } from "./report-settings-types";

interface EmailSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  onSave: () => void;
  saving: boolean;
}

export function EmailReportSection({
  form,
  setForm,
  onSave,
  saving,
}: EmailSectionProps) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base">Отчёты по электронной почте</CardTitle>
        <CardDescription>
          Укажите email и включите периодичность. Время отправки задаётся в
          секции Telegram (только для админов). Изменения применяются после
          нажатия кнопки «Сохранить».
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
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
