"use client";

import { Switch } from "@calls/ui";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type React from "react";
import { useORPC } from "@/orpc/react";
import type { ReportSettingsForm } from "./report-settings-types";

interface ReportContentTabProps {
  userId: string;
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
}

const settings = [
  {
    id: "report-detailed",
    key: "reportDetailed" as const,
    label: "Детальный отчёт",
    description: "Подробная информация по каждому звонку",
  },
  {
    id: "report-summaries",
    key: "reportIncludeCallSummaries" as const,
    label: "Сводки звонков",
    description: "Краткие описания содержания звонков",
  },
  {
    id: "report-avg-rating",
    key: "reportIncludeAvgRating" as const,
    label: "Средний рейтинг",
    description: "Средняя оценка качества звонков",
  },
  {
    id: "report-include-kpi",
    key: "reportIncludeKpi" as const,
    label: "Включать KPI данные",
    description: "Оклад, бонус и процент выполнения KPI в отчётах",
  },
];

export function ReportContentTab({ userId, form, setForm }: ReportContentTabProps) {
  const orpc = useORPC();

  const updateMutation = useMutation(
    orpc.users.updateReportSettings.mutationOptions({
      onSuccess: () => {
        toast.success("Настройки содержания отчётов сохранены");
      },
      onError: () => {
        toast.error("Не удалось сохранить настройки");
      },
    }),
  );

  const handleToggle = async (key: keyof ReportSettingsForm, checked: boolean) => {
    // Обновляем локальное состояние
    setForm((f) => ({ ...f, [key]: checked }));

    // Отправляем обновление на сервер
    const data: Partial<ReportSettingsForm> = {
      [key]: checked,
    };

    await updateMutation.mutateAsync({
      user_id: userId,
      data,
    });
  };

  return (
    <div className="w-full">
      <div className="mx-auto max-w-lg bg-white rounded-lg p-6">
        <p className="mb-4 text-sm font-medium">Содержание отчётов</p>
        <div className="flex flex-col gap-1">
          {settings.map((setting) => (
            <label
              key={setting.id}
              htmlFor={setting.id}
              className="flex cursor-pointer items-center justify-between py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{setting.label}</span>
                <span className="text-muted-foreground text-xs">{setting.description}</span>
              </div>
              <Switch
                id={setting.id}
                checked={form[setting.key]}
                onCheckedChange={(checked) => handleToggle(setting.key, checked === true)}
                disabled={updateMutation.isPending}
                size="sm"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
