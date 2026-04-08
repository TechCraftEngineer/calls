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
  FieldLabel,
  Input,
  Label,
} from "@calls/ui";
import type React from "react";
import type { User } from "@/lib/auth";
import { SendTestReportButton } from "../telegram/send-test-report-button";
import { REPORT_TYPE_LABELS, type ReportType } from "../types";
import type { ReportSettingsForm } from "./report-settings-types";
import { ReportDeliveryFrequency, ReportTimeSettings } from "./shared-report-controls";

interface MaxReportSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  isAdmin: boolean;
  onSendTest?: (reportType: ReportType) => void;
  sendTestLoading?: boolean;
  sendTestMessage?: string;
  sendTestSuccess?: boolean;
  sendTestReportType?: ReportType | null;
  user?: User;
  onConnect?: () => void;
  onDisconnect?: () => void;
  connectLoading?: boolean;
  disconnectLoading?: boolean;
}

export function MaxReportSection({
  form,
  setForm,
  isAdmin,
  onSendTest,
  sendTestLoading = false,
  sendTestMessage = "",
  sendTestSuccess = false,
  sendTestReportType,
  user,
  onConnect,
  onDisconnect,
  connectLoading,
  disconnectLoading,
}: MaxReportSectionProps) {
  const hasMax = !!form.maxChatId?.trim();
  const canSendTest = hasMax && !sendTestLoading;
  const primaryReportType = sendTestReportType ?? "daily";
  const primaryReportLabel = REPORT_TYPE_LABELS[primaryReportType] ?? REPORT_TYPE_LABELS.daily;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base">MAX Отчеты</CardTitle>
        <CardDescription>
          Полные настройки MAX-отчетов: периодичность, расписание, формат и мгновенная отправка
          выбранного типа.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Отчёты в мессенджер MAX. Для участников — только свои отчёты.
        </p>
        <Field>
          <FieldLabel asChild>
            <Label>MAX Chat ID</Label>
          </FieldLabel>
          <div className="flex gap-2">
            <Input
              type="text"
              value={form.maxChatId ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  maxChatId: e.target.value,
                }))
              }
              className="flex-1"
              placeholder="Подключите MAX или введите ID чата вручную"
            />
            {hasMax && onDisconnect && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDisconnect}
                disabled={disconnectLoading}
                className="shrink-0 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {disconnectLoading ? "…" : "Отвязать"}
              </Button>
            )}
          </div>
          {user && onConnect && !hasMax && (
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onConnect}
                disabled={connectLoading}
              >
                <span className="text-base">⚡</span> Подключить MAX
              </Button>
            </div>
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <ReportDeliveryFrequency form={form} setForm={setForm} channel="max" />
          {isAdmin && (
            <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal px-3">
              <Checkbox
                checked={form.maxManagerReport}
                onCheckedChange={(checked) =>
                  setForm((f) => ({
                    ...f,
                    maxManagerReport: checked === true,
                  }))
                }
              />
              Получать отчеты по всем менеджерам (MAX)
            </Label>
          )}
        </div>
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
                  className={`text-sm ${sendTestSuccess ? "text-success" : "text-destructive"}`}
                >
                  {sendTestMessage}
                </span>
              )}
            </div>
            {!hasMax && (
              <p className="text-xs text-muted-foreground">
                Сначала укажите MAX Chat ID, чтобы отправить тестовый отчет.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
