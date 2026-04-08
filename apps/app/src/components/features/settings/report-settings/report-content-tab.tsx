"use client";

import { Separator, Switch } from "@calls/ui";
import type React from "react";
import type { ReportSettingsForm } from "./report-settings-types";

interface ReportContentTabProps {
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
    id: "report-avg-value",
    key: "reportIncludeAvgValue" as const,
    label: "Средняя ценность",
    description: "Средняя ценность звонков",
  },
];

export function ReportContentTab({ form, setForm }: ReportContentTabProps) {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-lg bg-white rounded-lg p-6 shadow-sm border">
        <p className="mb-3 text-sm font-medium">Содержание отчётов</p>
        <Separator />
        <div className="flex flex-col">
          {settings.map((setting) => (
            <label
              key={setting.id}
              htmlFor={setting.id}
              className="flex cursor-pointer items-center justify-between border-b py-3 last:border-b-0"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{setting.label}</span>
                <span className="text-muted-foreground text-xs">{setting.description}</span>
              </div>
              <Switch
                id={setting.id}
                checked={form[setting.key]}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, [setting.key]: checked }))}
                size="sm"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
