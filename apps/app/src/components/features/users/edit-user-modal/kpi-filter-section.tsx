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
            ["kpiBaseSalary", "Базовый оклад (₽)"],
            ["kpiTargetBonus", "Целевой бонус (₽)"],
            [
              "kpiTargetTalkTimeMinutes",
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
            checked={form.filterExcludeAnsweringMachine}
            onChange={(e) =>
              onFormChange({
                filterExcludeAnsweringMachine: e.target.checked,
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
            value={form.filterMinDuration ?? ""}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              onFormChange({
                filterMinDuration: Number.isNaN(value) ? 0 : Math.max(0, value),
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
            value={form.filterMinReplicas ?? ""}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              onFormChange({
                filterMinReplicas: Number.isNaN(value) ? 0 : Math.max(0, value),
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
