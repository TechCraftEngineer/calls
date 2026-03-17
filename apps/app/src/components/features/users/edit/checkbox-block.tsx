"use client";

import { Button } from "@calls/ui";
import type { EditUserForm } from "@/components/features/users/types";

interface CheckboxBlockProps {
  title: string;
  form: EditUserForm;
  setForm: (form: EditUserForm) => void;
  fields: Array<keyof EditUserForm>;
  labels: string[];
  hasChanges: boolean;
  isSaving: boolean;
  state: "idle" | "saving" | "success" | "error";
  onSave: () => void;
  disabled: boolean;
}

export function CheckboxBlock({
  title,
  form,
  setForm,
  fields,
  labels,
  hasChanges,
  isSaving,
  state,
  onSave,
  disabled,
}: CheckboxBlockProps) {
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

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6 transition-all duration-300 ${getBlockAnimationClass()}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hasChanges && (
          <div className="flex items-center gap-1 text-amber-600">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium hidden sm:inline">
              Есть изменения
            </span>
            <span className="text-xs font-medium sm:hidden">*</span>
          </div>
        )}
        {state === "saving" && (
          <div className="flex items-center gap-1 text-blue-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-spin"></div>
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

      <div className="space-y-2">
        {fields.map((field, index) => (
          <label
            key={String(field)}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              checked={Boolean(form[field])}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, [field]: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            {labels[index]}
          </label>
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
