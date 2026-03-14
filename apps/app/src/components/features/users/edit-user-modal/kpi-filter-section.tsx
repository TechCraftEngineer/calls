"use client";

import { Input } from "@calls/ui";
import type { EditUserForm } from "../types";

interface KpiFilterSectionProps {
  form: EditUserForm;
  onFormChange: (updates: Partial<EditUserForm>) => void;
}

export function KpiFilterSection({
  form,
  onFormChange,
}: KpiFilterSectionProps) {
  return (
    <>
      {/* Настройки KPI */}
      <div className="mb-4 p-4 bg-[#f5f7fa] rounded-lg">
        <h3 className="m-0 mb-3 text-sm font-bold">Настройки KPI</h3>
        {(
          [
            ["kpi_base_salary", "Базовый оклад (₽)"],
            ["kpi_target_bonus", "Целевой бонус (₽)"],
            [
              "kpi_target_talk_time_minutes",
              "Целевое время разговоров в месяц (мин)",
            ],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="mb-3">
            <label className="block mb-1 text-[13px] font-semibold">
              {label}
            </label>
            <Input
              type="number"
              value={form[key]}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                onFormChange({
                  [key]: Number.isNaN(value) ? 0 : Math.max(0, value),
                });
              }}
              className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
            />
          </div>
        ))}
      </div>

      {/* Исключить из отчётов */}
      <div className="mb-4 p-4 bg-[#f5f7fa] rounded-lg">
        <h3 className="m-0 mb-3 text-sm font-bold">Исключить из отчётов</h3>
        <label className="flex items-center gap-2 text-[13px] cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={form.filter_exclude_answering_machine}
            onChange={(e) =>
              onFormChange({
                filter_exclude_answering_machine: e.target.checked,
              })
            }
          />
          Автоответчики
        </label>
        <div className="mb-2">
          <label className="block mb-1 text-[13px] font-semibold">
            Звонки короче (сек)
          </label>
          <Input
            type="number"
            min={0}
            value={form.filter_min_duration ?? ""}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              onFormChange({
                filter_min_duration: Number.isNaN(value)
                  ? 0
                  : Math.max(0, value),
              });
            }}
            className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
            placeholder="0 — не исключать"
          />
        </div>
        <div>
          <label className="block mb-1 text-[13px] font-semibold">
            Меньше реплик
          </label>
          <Input
            type="number"
            min={0}
            value={form.filter_min_replicas ?? ""}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              onFormChange({
                filter_min_replicas: Number.isNaN(value)
                  ? 0
                  : Math.max(0, value),
              });
            }}
            className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
            placeholder="0 — не исключать"
          />
        </div>
      </div>
    </>
  );
}
