"use client";

import { Button, Input } from "@calls/ui";
import type { EditUserForm } from "@/components/features/users/types";

interface KpiBlockProps {
  form: EditUserForm;
  setForm: (form: EditUserForm) => void;
  hasChanges: boolean;
  isSaving: boolean;
  state: "idle" | "saving" | "success" | "error";
  onSave: () => void;
  disabled: boolean;
}

const KPI_FIELDS = [
  ["kpiBaseSalary", "Базовый оклад (₽)", "0"],
  ["kpiTargetBonus", "Целевой бонус (₽)", "0"],
  ["kpiTargetTalkTimeMinutes", "Целевое время разговоров в месяц (мин)", "0"],
] as const;

export function KpiBlock({
  form,
  setForm,
  hasChanges,
  isSaving,
  state,
  onSave,
  disabled,
}: KpiBlockProps) {
  const getBlockAnimationClass = () => {
    switch (state) {
      case "success":
        return "animate-pulse border-green-200 bg-green-50";
      case "error":
        return "animate-pulse border-red-200 bg-red-50";
      case "saving":
        return "opacity-75";
      default:
        return "";
    }
  };

  const handleNumberChange = (
    key: (typeof KPI_FIELDS)[number][0],
    value: string,
  ) => {
    const num = parseInt(value, 10);
    // Prevent extremely large numbers that could cause issues
    const maxValue = 999999999; // 1 billion
    const safeNum = Number.isNaN(num)
      ? 0
      : Math.max(0, Math.min(maxValue, num));
    setForm({
      ...form,
      [key]: safeNum,
    });
  };

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6 transition-all duration-300 ${getBlockAnimationClass()}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">Настройки KPI</h2>
        {hasChanges && (
          <div className="flex items-center gap-1 text-amber-600">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium hidden sm:inline">
              Есть изменения
            </span>
            <span className="text-xs font-medium sm:hidden">*</span>
          </div>
        )}
        {state === "saving" && (
          <div className="flex items-center gap-1 text-blue-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-spin" />
            <span className="text-xs font-medium hidden sm:inline">
              Сохранение...
            </span>
          </div>
        )}
        {state === "success" && (
          <div className="flex items-center gap-1 text-green-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-medium hidden sm:inline">
              Сохранено
            </span>
          </div>
        )}
        {state === "error" && (
          <div className="flex items-center gap-1 text-red-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-medium hidden sm:inline">Ошибка</span>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Укажите суммы и целевые показатели для расчёта KPI в отчётах и на
        вкладке «Расчёт KPI».
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KPI_FIELDS.map(([key, label, placeholder]) => (
          <div key={key}>
            <label className="block mb-1.5 text-[13px] font-semibold">
              {label}
            </label>
            <Input
              type="number"
              min={0}
              value={form[key] ?? ""}
              onChange={(e) => handleNumberChange(key, e.target.value)}
              className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border font-medium tabular-nums"
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>

      <Button
        type="button"
        onClick={onSave}
        disabled={disabled || state === "saving"}
        variant="default"
        size="sm"
        className="gap-2 w-full sm:w-auto mt-4"
      >
        {isSaving && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {isSaving ? "Сохранение..." : "Сохранить"}
      </Button>
    </div>
  );
}
