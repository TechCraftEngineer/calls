"use client";

import { Button, Checkbox, Field, FieldLabel, Input, Label } from "@calls/ui";
import type React from "react";
import type { User } from "@/lib/auth";
import type { ReportSettingsForm } from "../report-settings-types";

interface MaxReportSectionProps {
  form: Pick<
    ReportSettingsForm,
    "maxChatId" | "maxDailyReport" | "maxManagerReport"
  >;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  isAdmin: boolean;
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
  user,
  onConnect,
  onDisconnect,
  connectLoading,
  disconnectLoading,
}: MaxReportSectionProps) {
  const hasMax = !!form.maxChatId?.trim();

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <h4 className="mb-2 text-sm font-bold">MAX Отчеты</h4>
      <p className="mb-3 text-sm text-muted-foreground">
        Отчёты в мессенджер MAX. Для участников — только свои отчёты.
      </p>
      <Field className="mb-3">
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
        <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={form.maxDailyReport}
            onCheckedChange={(checked) =>
              setForm((f) => ({
                ...f,
                maxDailyReport: checked === true,
              }))
            }
          />
          Получать свои ежедневные отчеты (MAX)
        </Label>
        {isAdmin && (
          <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
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
    </div>
  );
}
