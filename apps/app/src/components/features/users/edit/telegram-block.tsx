"use client";

import { Button, Input } from "@calls/ui";
import type { EditUserForm } from "@/components/features/users/types";

interface TelegramBlockProps {
  form: EditUserForm;
  setForm: (form: EditUserForm) => void;
  hasChanges: boolean;
  isSaving: boolean;
  state: "idle" | "saving" | "success" | "error";
  onSave: () => void;
  disabled: boolean;
  onDisconnect: () => void;
  onConnect?: () => void;
  onCheckConnection?: () => void;
  connectLoading?: boolean;
  checkConnectionLoading?: boolean;
}

export function TelegramBlock({
  form,
  setForm,
  hasChanges,
  isSaving,
  state,
  onSave,
  disabled,
  onDisconnect,
  onConnect,
  onCheckConnection,
  connectLoading,
  checkConnectionLoading,
}: TelegramBlockProps) {
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

  const telegramOptions = [
    ["telegram_daily_report", "Ежедневный отчет (Telegram)"],
    ["telegram_manager_report", "Отчет по менеджерам (Telegram)"],
    ["telegram_weekly_report", "Еженедельный отчет (Telegram)"],
    ["telegram_monthly_report", "Ежемесячный отчет (Telegram)"],
  ] as const;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6 transition-all duration-300 ${getBlockAnimationClass()}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Telegram</h2>
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
              <span className="text-xs font-medium hidden sm:inline">
                Ошибка
              </span>
            </div>
          )}
        </div>
        <Button
          type="button"
          onClick={onSave}
          disabled={disabled || state === "saving"}
          variant="default"
          size="sm"
          className="gap-2 w-full sm:w-auto"
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

      <div className="mb-4">
        <label className="block mb-1 text-[13px] font-semibold">
          Telegram Chat ID
        </label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={form.telegramChatId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm({ ...form, telegramChatId: e.target.value })
            }
            className="flex-1 py-2 px-3 border border-[#ddd] rounded-md box-border"
            placeholder="Нажмите «Подключить Telegram» или введите ID вручную"
          />
          {form.telegramChatId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              className="gap-2 shrink-0"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Отвязать
            </Button>
          )}
        </div>
        {onConnect && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {!form.telegramChatId ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onConnect}
                  disabled={connectLoading}
                  className="text-[13px] text-[#0088cc] border-[#0088cc] hover:bg-blue-50 hover:text-[#0088cc]"
                >
                  {connectLoading ? (
                    "…"
                  ) : (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="mr-1 inline"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.48-.94-2.4-1.54-1.06-.7-.37-1.09.23-1.72.16-.16 2.87-2.63 2.92-2.85.01-.03.01-.14-.06-.2-.06-.05-.16-.03-.24-.01-.34.08-5.34 3.45-5.56 3.6-.32.22-.6.33-.85.33-.28-.01-.81-.26-1.2-.56-.48-.38-.86-.58-.82-1.23.02-.34.49-.69 1.28-1.05 5.03-2.18 8.38-3.62 10.04-4.3 2.8-1.16 3.38-1.36 3.76-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z" />
                      </svg>
                      Подключить Telegram
                    </>
                  )}
                </Button>
                {onCheckConnection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCheckConnection}
                    disabled={checkConnectionLoading}
                  >
                    {checkConnectionLoading ? "…" : "Проверить подключение"}
                  </Button>
                )}
              </>
            ) : (
              onCheckConnection && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCheckConnection}
                  disabled={checkConnectionLoading}
                >
                  {checkConnectionLoading ? "…" : "Проверить подключение"}
                </Button>
              )
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {telegramOptions.map(([key, label]) => (
          <label
            key={key}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              checked={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
