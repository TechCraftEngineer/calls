import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Field,
  FieldLabel,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@calls/ui";
import { ChevronDown } from "lucide-react";
import type React from "react";
import type { User } from "@/lib/auth";
import type { ReportSettingsForm } from "../report-settings-types";
import type { ReportType } from "../types";

interface TelegramSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  isAdmin: boolean;
  sendTestLoading: boolean;
  sendTestReportType: ReportType | null;
  sendTestMessage: string;
  onSendTest: (reportType: ReportType) => void;
  user?: User;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onCheckConnection?: () => void;
  connectLoading?: boolean;
  disconnectLoading?: boolean;
  checkConnectionLoading?: boolean;
}

export function TelegramReportSection({
  form,
  setForm,
  isAdmin,
  sendTestLoading,
  sendTestReportType,
  sendTestMessage,
  onSendTest,
  user,
  onConnect,
  onDisconnect,
  onCheckConnection,
  connectLoading,
  disconnectLoading,
  checkConnectionLoading,
}: TelegramSectionProps) {
  const canSendTest = form.telegramChatId?.trim() && !sendTestLoading;
  const hasTelegram = !!form.telegramChatId?.trim();
  const primaryReportType = sendTestReportType ?? "daily";
  const primaryReportLabel =
    primaryReportType === "daily"
      ? "ежедневный"
      : primaryReportType === "weekly"
        ? "еженедельный"
        : "ежемесячный";

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <h4 className="mb-3 text-sm font-bold">Telegram Отчеты</h4>
      <Field className="mb-3">
        <FieldLabel asChild>
          <Label>Telegram Chat ID</Label>
        </FieldLabel>
        <div className="flex gap-2">
          <Input
            type="text"
            value={form.telegramChatId}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                telegramChatId: e.target.value,
              }))
            }
            className="flex-1"
            placeholder="Нажмите «Подключить Telegram» или введите ID вручную"
          />
          {hasTelegram && onDisconnect && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              disabled={disconnectLoading}
              className="shrink-0 text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {disconnectLoading ? "…" : "Отвязать"}
            </Button>
          )}
        </div>
        {user && onConnect && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {!hasTelegram ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onConnect}
                  disabled={connectLoading}
                >
                  {connectLoading ? "…" : "Подключить Telegram"}
                </Button>
                {onCheckConnection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCheckConnection}
                    disabled={checkConnectionLoading}
                  >
                    {checkConnectionLoading ? "…" : "Проверить подключение"}
                  </Button>
                )}
              </>
            ) : (
              onCheckConnection && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCheckConnection}
                  disabled={checkConnectionLoading}
                >
                  {checkConnectionLoading ? "…" : "Проверить подключение"}
                </Button>
              )
            )}
          </div>
        )}
      </Field>
      <div className="flex flex-col gap-2">
        <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={form.telegramDailyReport}
            onCheckedChange={(checked) =>
              setForm((f) => ({
                ...f,
                telegramDailyReport: checked === true,
              }))
            }
          />
          Ежедневный отчет
        </Label>
        <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={form.telegramWeeklyReport}
            onCheckedChange={(checked) =>
              setForm((f) => ({
                ...f,
                telegramWeeklyReport: checked === true,
              }))
            }
          />
          Еженедельный отчет
        </Label>
        <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={form.telegramMonthlyReport}
            onCheckedChange={(checked) =>
              setForm((f) => ({
                ...f,
                telegramMonthlyReport: checked === true,
              }))
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
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center">
          <Button
            type="button"
            variant={canSendTest ? "success" : "default"}
            size="sm"
            disabled={!form.telegramChatId?.trim() || sendTestLoading}
            onClick={() => onSendTest(primaryReportType)}
            className="rounded-r-none"
          >
            {sendTestLoading
              ? `Отправка ${primaryReportLabel} отчёта…`
              : `Отправить ${primaryReportLabel} отчёт`}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={canSendTest ? "success" : "default"}
                size="sm"
                disabled={!form.telegramChatId?.trim() || sendTestLoading}
                className="rounded-l-none border-l border-primary-foreground/20 px-2"
                aria-label="Выбрать тип отчёта"
              >
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onSendTest("daily")}>
                Ежедневный отчёт
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSendTest("weekly")}>
                Еженедельный отчёт
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSendTest("monthly")}>
                Ежемесячный отчёт
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {sendTestMessage && (
          <span
            className={`text-sm ${
              sendTestMessage.includes("отправлен")
                ? "text-success"
                : "text-destructive"
            }`}
          >
            {sendTestMessage}
          </span>
        )}
      </div>
      {isAdmin && <ReportTimeSettings form={form} setForm={setForm} />}
    </div>
  );
}

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

function ReportTimeSettings({
  form,
  setForm,
}: {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
}) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <h4 className="mb-2 text-sm font-bold">Время отправки (для всех)</h4>
      <div className="flex flex-wrap items-center gap-3">
        <Field orientation="horizontal" className="items-center gap-2">
          <Label className="text-xs font-normal">Ежедневно:</Label>
          <Select
            value={form.reportDailyTime}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                reportDailyTime: v,
              }))
            }
          >
            <SelectTrigger size="sm" className="h-8 w-[90px]">
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
            onValueChange={(v) =>
              setForm((f) => ({ ...f, reportWeeklyDay: v }))
            }
          >
            <SelectTrigger size="sm" className="h-8 w-[70px]">
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
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                reportWeeklyTime: v,
              }))
            }
          >
            <SelectTrigger size="sm" className="h-8 w-[90px]">
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
            onValueChange={(v) =>
              setForm((f) => ({ ...f, reportMonthlyDay: v }))
            }
          >
            <SelectTrigger size="sm" className="h-8 w-[100px]">
              <SelectValue placeholder="День" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last">Последний день</SelectItem>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={form.reportMonthlyTime}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                reportMonthlyTime: v,
              }))
            }
          >
            <SelectTrigger size="sm" className="h-8 w-[90px]">
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
    </div>
  );
}
