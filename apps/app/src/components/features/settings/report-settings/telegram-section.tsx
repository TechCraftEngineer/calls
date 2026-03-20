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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@calls/ui";
import type React from "react";
import type { User } from "@/lib/auth";
import { SendTestReportButton } from "../telegram/send-test-report-button";
import { REPORT_TYPE_LABELS, type ReportType } from "../types";
import type { ReportSettingsForm } from "./report-settings-types";

interface TelegramSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  isAdmin: boolean;
  onSave: () => void;
  saving: boolean;
  sendTestLoading?: boolean;
  sendTestSuccess?: boolean;
  sendTestReportType?: ReportType | null;
  sendTestMessage?: string;
  onSendTest?: (reportType: ReportType) => void;
  user?: User;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onCheckConnection?: () => void;
  connectLoading?: boolean;
  disconnectLoading?: boolean;
  // Alias props (used by older call sites)
  connecting?: boolean;
  disconnecting?: boolean;
  checkConnectionLoading?: boolean;
}

export function TelegramReportSection({
  form,
  setForm,
  isAdmin,
  onSave,
  saving,
  sendTestLoading,
  sendTestSuccess,
  sendTestReportType,
  sendTestMessage,
  onSendTest,
  user,
  onConnect,
  onDisconnect,
  onCheckConnection,
  connectLoading,
  disconnectLoading,
  connecting,
  disconnecting,
  checkConnectionLoading,
}: TelegramSectionProps) {
  const sendTestLoadingSafe = sendTestLoading ?? false;
  const sendTestMessageSafe = sendTestMessage ?? "";
  const sendTestSuccessSafe = sendTestSuccess ?? false;

  const effectiveConnectLoading = connectLoading ?? connecting ?? false;
  const effectiveDisconnectLoading =
    disconnectLoading ?? disconnecting ?? false;

  const canSendTest = form.telegramChatId?.trim() && !sendTestLoadingSafe;
  const hasTelegram = !!form.telegramChatId?.trim();
  const primaryReportType = sendTestReportType ?? "daily";
  const primaryReportLabel =
    REPORT_TYPE_LABELS[primaryReportType] ?? REPORT_TYPE_LABELS.daily;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base">Telegram Отчеты</CardTitle>
        <CardDescription>
          Настройте куда и как отправлять отчёты в Telegram. Для админов
          доступно расписание отправки.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                disabled={effectiveDisconnectLoading}
                className="shrink-0 text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {effectiveDisconnectLoading ? "…" : "Отвязать"}
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Можно подключить Telegram по кнопке или указать Chat ID вручную.
          </p>
          {user && onConnect && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {!hasTelegram ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onConnect}
                    disabled={effectiveConnectLoading}
                  >
                    {effectiveConnectLoading ? "…" : "Подключить Telegram"}
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
        <Separator />
        {onSendTest && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <SendTestReportButton
                onSendTest={onSendTest}
                primaryReportType={primaryReportType}
                primaryReportLabel={primaryReportLabel}
                sendTestLoading={sendTestLoadingSafe}
                canSendTest={Boolean(canSendTest)}
                variant={canSendTest ? "success" : "default"}
                size="sm"
              />
              {sendTestMessageSafe && (
                <span
                  className={`text-sm ${
                    sendTestSuccessSafe ? "text-success" : "text-destructive"
                  }`}
                >
                  {sendTestMessageSafe}
                </span>
              )}
            </div>
            {!form.telegramChatId?.trim() && (
              <p className="text-xs text-muted-foreground">
                Сначала подключите Telegram или укажите Telegram Chat ID, затем
                можно отправить тестовый отчёт.
              </p>
            )}
          </div>
        )}
        {isAdmin && <ReportTimeSettings form={form} setForm={setForm} />}
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
    <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
      <div>
        <h4 className="text-sm font-bold">Расписание отправки отчётов</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Влияет на ежедневные/еженедельные/ежемесячные рассылки. Изменения
          применяются при сохранении этой секции.
        </p>
      </div>

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
            onValueChange={(v) =>
              setForm((f) => ({ ...f, reportWeeklyDay: v }))
            }
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
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                reportWeeklyTime: v,
              }))
            }
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
            onValueChange={(v) =>
              setForm((f) => ({ ...f, reportMonthlyDay: v }))
            }
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
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                reportMonthlyTime: v,
              }))
            }
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
    </div>
  );
}
