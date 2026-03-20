"use client";

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
import type { User } from "@/lib/auth";
import type { ReportSettingsForm } from "./report-settings-types";

interface MaxReportSectionProps {
  form: Pick<
    ReportSettingsForm,
    "maxChatId" | "maxDailyReport" | "maxManagerReport"
  >;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  isAdmin: boolean;
  onSave: () => void;
  saving: boolean;
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
  onSave,
  saving,
  user,
  onConnect,
  onDisconnect,
  connectLoading,
  disconnectLoading,
}: MaxReportSectionProps) {
  const hasMax = !!form.maxChatId?.trim();

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base">MAX Отчеты</CardTitle>
        <CardDescription>
          Настройки отправки отчётов в MAX. Для админов доступен режим “по всем
          менеджерам”. Время отправки задаётся в секции Telegram (только для
          админов).
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
