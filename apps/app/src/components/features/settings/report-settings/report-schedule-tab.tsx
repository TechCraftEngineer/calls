"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@calls/ui";
import { Calendar, Clock, Save } from "lucide-react";
import type React from "react";
import type { ReportSettingsForm } from "./report-settings-types";

interface ReportScheduleTabProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  isAdmin: boolean;
  onSave: () => void;
  saving?: boolean;
}

const WEEKDAYS = [
  { value: "mon", label: "Понедельник" },
  { value: "tue", label: "Вторник" },
  { value: "wed", label: "Среда" },
  { value: "thu", label: "Четверг" },
  { value: "fri", label: "Пятница" },
  { value: "sat", label: "Суббота" },
  { value: "sun", label: "Воскресенье" },
] as const;

const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const value = `${hour.toString().padStart(2, "0")}:00`;
  return { value, label: value };
});

function timeOptionsWithFallback(currentValue: string) {
  const hasCurrent =
    currentValue &&
    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(currentValue) &&
    !TIME_OPTIONS.some((o) => o.value === currentValue);
  if (hasCurrent) {
    return [{ value: currentValue, label: currentValue }, ...TIME_OPTIONS];
  }
  return TIME_OPTIONS;
}

export function ReportScheduleTab({
  form,
  setForm,
  isAdmin,
  onSave,
  saving,
}: ReportScheduleTabProps) {
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Расписание отправки
          </CardTitle>
          <CardDescription>
            Только администраторы могут настраивать расписание отчётов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
            Обратитесь к администратору для изменения расписания
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Расписание отправки отчётов
          </CardTitle>
          <CardDescription>Настройте время отправки для всех типов отчётов</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6 space-y-6">
          {/* Daily Schedule */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ежедневно</Label>
            <Field orientation="horizontal" className="items-center gap-3">
              <Select
                value={form.reportDailyTime}
                onValueChange={(v) => setForm((f) => ({ ...f, reportDailyTime: v }))}
              >
                <SelectTrigger className="h-9 w-28">
                  <SelectValue placeholder="Время" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptionsWithFallback(form.reportDailyTime).map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Опция пропуска выходных */}
          <div className="space-y-2">
            <Field orientation="horizontal" className="items-center gap-2">
              <Checkbox
                id="reportSkipWeekends"
                checked={form.reportSkipWeekends}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, reportSkipWeekends: checked === true }))
                }
              />
              <Label htmlFor="reportSkipWeekends" className="text-sm font-normal cursor-pointer">
                Не отправлять в выходные (суббота и воскресенье)
              </Label>
            </Field>
          </div>

          {/* Weekly Schedule */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Еженедельно</Label>
            <Field orientation="horizontal" className="items-center gap-3 flex-wrap">
              <div className="flex gap-2">
                <Select
                  value={form.reportWeeklyDay}
                  onValueChange={(v) => setForm((f) => ({ ...f, reportWeeklyDay: v }))}
                >
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={form.reportWeeklyTime}
                  onValueChange={(v) => setForm((f) => ({ ...f, reportWeeklyTime: v }))}
                >
                  <SelectTrigger className="h-9 w-28">
                    <SelectValue placeholder="Время" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptionsWithFallback(form.reportWeeklyTime).map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Field>
          </div>

          {/* Monthly Schedule */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ежемесячно</Label>
            <Field orientation="horizontal" className="items-center gap-3 flex-wrap">
              <div className="flex gap-2">
                <Select
                  value={form.reportMonthlyDay}
                  onValueChange={(v) => setForm((f) => ({ ...f, reportMonthlyDay: v }))}
                >
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue placeholder="День" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last">Последний день месяца</SelectItem>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} число
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={form.reportMonthlyTime}
                  onValueChange={(v) => setForm((f) => ({ ...f, reportMonthlyTime: v }))}
                >
                  <SelectTrigger className="h-9 w-28">
                    <SelectValue placeholder="Время" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptionsWithFallback(form.reportMonthlyTime).map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={onSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Сохранение..." : "Сохранить расписание"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Календарь отправки
          </CardTitle>
          <CardDescription>Предпросмотр ближайших дат отправки отчётов</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-1">Следующий ежедневный</div>
              <div className="font-medium">Сегодня, {form.reportDailyTime}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-1">Следующий еженедельный</div>
              <div className="font-medium">
                {WEEKDAYS.find((d) => d.value === form.reportWeeklyDay)?.label},{" "}
                {form.reportWeeklyTime}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-1">Следующий ежемесячный</div>
              <div className="font-medium">
                {form.reportMonthlyDay === "last"
                  ? "Последний день"
                  : `${form.reportMonthlyDay} число`}
                , {form.reportMonthlyTime}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
