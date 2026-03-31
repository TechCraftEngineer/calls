import {
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
import type React from "react";
import type { ReportSettingsForm } from "./report-settings-types";

const WEEKDAYS = [
  { value: "mon", label: "Пн" },
  { value: "tue", label: "Вт" },
  { value: "wed", label: "Ср" },
  { value: "thu", label: "Чт" },
  { value: "fri", label: "Пт" },
  { value: "sat", label: "Сб" },
  { value: "sun", label: "Вс" },
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

export function ReportDeliveryFrequency({
  form,
  setForm,
  channel,
}: {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  channel: "email" | "telegram" | "max";
}) {
  const isEmail = channel === "email";
  const isTelegram = channel === "telegram";
  const dailyKey = isEmail
    ? "emailDailyReport"
    : isTelegram
      ? "telegramDailyReport"
      : "maxDailyReport";
  const weeklyKey = isEmail ? "emailWeeklyReport" : "telegramWeeklyReport";
  const monthlyKey = isEmail ? "emailMonthlyReport" : "telegramMonthlyReport";

  return (
    <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
      <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
        <Checkbox
          checked={Boolean(form[dailyKey])}
          onCheckedChange={(checked) => setForm((f) => ({ ...f, [dailyKey]: checked === true }))}
        />
        Ежедневный отчет
      </Label>

      {!isTelegram && channel !== "max" && (
        <>
          <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={Boolean(form[weeklyKey])}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, [weeklyKey]: checked === true }))
              }
            />
            Еженедельный отчет
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={Boolean(form[monthlyKey])}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, [monthlyKey]: checked === true }))
              }
            />
            Ежемесячный отчет
          </Label>
        </>
      )}

      {isTelegram && (
        <>
          <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={Boolean(form[weeklyKey])}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, [weeklyKey]: checked === true }))
              }
            />
            Еженедельный отчет
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={Boolean(form[monthlyKey])}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, [monthlyKey]: checked === true }))
              }
            />
            Ежемесячный отчет
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={form.telegramSkipWeekends}
              onCheckedChange={(checked) =>
                setForm((f) => ({
                  ...f,
                  telegramSkipWeekends: checked === true,
                }))
              }
            />
            Не отправлять отчёты в Telegram в выходные
          </Label>
        </>
      )}
    </div>
  );
}

export function ReportTimeSettings({
  form,
  setForm,
}: {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
}) {
  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
      <div>
        <h4 className="text-sm font-bold">Когда отправлять отчеты</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Это общее расписание для ежедневных, еженедельных и ежемесячных рассылок.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Field orientation="horizontal" className="items-center gap-2">
          <Label className="text-xs font-normal">Ежедневно:</Label>
          <Select
            value={form.reportDailyTime}
            onValueChange={(v) => setForm((f) => ({ ...f, reportDailyTime: v }))}
          >
            <SelectTrigger size="sm" className="h-8 w-22.5">
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

        <Field orientation="horizontal" className="items-center gap-2">
          <Label className="text-xs font-normal">Еженедельно:</Label>
          <Select
            value={form.reportWeeklyDay}
            onValueChange={(v) => setForm((f) => ({ ...f, reportWeeklyDay: v }))}
          >
            <SelectTrigger size="sm" className="h-8 w-17.5">
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
            <SelectTrigger size="sm" className="h-8 w-22.5">
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
        </Field>

        <Field orientation="horizontal" className="items-center gap-2">
          <Label className="text-xs font-normal">Ежемесячно:</Label>
          <Select
            value={form.reportMonthlyDay}
            onValueChange={(v) => setForm((f) => ({ ...f, reportMonthlyDay: v }))}
          >
            <SelectTrigger size="sm" className="h-8 w-25">
              <SelectValue placeholder="День" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last">Последний день</SelectItem>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={form.reportMonthlyTime}
            onValueChange={(v) => setForm((f) => ({ ...f, reportMonthlyTime: v }))}
          >
            <SelectTrigger size="sm" className="h-8 w-22.5">
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
        </Field>
      </div>
      <Separator />
    </div>
  );
}
