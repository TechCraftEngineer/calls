import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldLabel,
  Input,
  Label,
} from "@calls/ui";
import type React from "react";
import { SendTestReportButton } from "../telegram/send-test-report-button";
import { REPORT_TYPE_LABELS, type ReportType } from "../types";
import type { ReportSettingsForm } from "./report-settings-types";
import {
  ReportDeliveryFrequency,
  ReportTimeSettings,
} from "./shared-report-controls";

interface EmailSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  isAdmin: boolean;
  onSave: () => void;
  saving: boolean;
  onSendTest?: (reportType: ReportType) => void;
  sendTestLoading?: boolean;
  sendTestMessage?: string;
  sendTestSuccess?: boolean;
  sendTestReportType?: ReportType | null;
}

export function EmailReportSection({
  form,
  setForm,
  isAdmin,
  onSave,
  saving,
  onSendTest,
  sendTestLoading = false,
  sendTestMessage = "",
  sendTestSuccess = false,
  sendTestReportType,
}: EmailSectionProps) {
  const canSendTest = Boolean(form.email.trim()) && !sendTestLoading;
  const primaryReportType = sendTestReportType ?? "daily";
  const primaryReportLabel =
    REPORT_TYPE_LABELS[primaryReportType] ?? REPORT_TYPE_LABELS.daily;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base">Отчёты по электронной почте</CardTitle>
        <CardDescription>
          Полные настройки email-отчетов: периодичность, расписание, формат и
          мгновенная отправка выбранного типа.
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
        <ReportDeliveryFrequency
          form={form}
          setForm={setForm}
          channel="email"
        />
        {isAdmin && <ReportTimeSettings form={form} setForm={setForm} />}

        {onSendTest && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <SendTestReportButton
                onSendTest={onSendTest}
                primaryReportType={primaryReportType}
                primaryReportLabel={primaryReportLabel}
                sendTestLoading={sendTestLoading}
                canSendTest={canSendTest}
                variant={canSendTest ? "success" : "default"}
                size="sm"
              />
              {sendTestMessage && (
                <span
                  className={`text-sm ${
                    sendTestSuccess ? "text-success" : "text-destructive"
                  }`}
                >
                  {sendTestMessage}
                </span>
              )}
            </div>
            {!form.email.trim() && (
              <p className="text-xs text-muted-foreground">
                Укажите email, чтобы отправить тестовый отчет.
              </p>
            )}
          </div>
        )}
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
