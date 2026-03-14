import { Card, CardContent, CardHeader, Input } from "@calls/ui";
import type React from "react";
import { useState } from "react";
import api from "@/lib/api";
import type { User } from "@/lib/auth";
import { getDisplayName } from "@/lib/user-profile";

interface ReportSettingsFormBodyProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  handleSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  message: string;
  user: User;
  isAdmin: boolean;
  allUsers: any[];
}

export default function ReportSettingsFormBody({
  form,
  setForm,
  handleSubmit,
  saving,
  message,
  user,
  isAdmin,
  allUsers,
}: ReportSettingsFormBodyProps) {
  const [sendTestLoading, setSendTestLoading] = useState(false);
  const [sendTestMessage, setSendTestMessage] = useState("");

  const canSendTest = form.telegramChatId?.trim() && !sendTestLoading;

  return (
    <Card className="card mt-6">
      <CardHeader className="p-0 pb-0">
        <h3 className="section-title mb-5">Мои настройки отчетов</h3>
      </CardHeader>
      <CardContent className="p-0 pt-0">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
            <div className="p-4 bg-[#f5f7fa] rounded-lg">
              <h4 className="m-0 mb-3 text-sm font-bold">Telegram Отчеты</h4>
              <div className="mb-3">
                <label className="block mb-1 text-[13px] font-semibold">
                  Telegram Chat ID
                </label>
                <Input
                  type="text"
                  value={form.telegramChatId}
                  onChange={(e) =>
                    setForm((f: any) => ({
                      ...f,
                      telegramChatId: e.target.value,
                    }))
                  }
                  className="w-full py-2 px-3 border border-[#ddd] rounded-md"
                  placeholder="Напишите боту /start чтобы узнать ID"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.telegram_daily_report}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        telegram_daily_report: e.target.checked,
                      }))
                    }
                  />{" "}
                  Ежедневный отчет
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.telegram_weekly_report}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        telegram_weekly_report: e.target.checked,
                      }))
                    }
                  />{" "}
                  Еженедельный отчет
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.telegram_monthly_report}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        telegram_monthly_report: e.target.checked,
                      }))
                    }
                  />{" "}
                  Ежемесячный отчет
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.telegram_skip_weekends}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        telegram_skip_weekends: e.target.checked,
                      }))
                    }
                  />{" "}
                  Не отправлять отчёты в Telegram в выходные
                </label>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  disabled={!form.telegramChatId?.trim() || sendTestLoading}
                  onClick={async () => {
                    setSendTestMessage("");
                    setSendTestLoading(true);
                    try {
                      await api.reports.sendTestTelegram();
                      setSendTestMessage("Отчёт отправлен в Telegram");
                      setTimeout(() => setSendTestMessage(""), 4000);
                    } catch (err: unknown) {
                      const d = err instanceof Error ? err.message : null;
                      setSendTestMessage(
                        typeof d === "string"
                          ? d
                          : "Не удалось отправить. Укажите Telegram Chat ID.",
                      );
                    } finally {
                      setSendTestLoading(false);
                    }
                  }}
                  className={
                    canSendTest
                      ? "py-2 px-4 border-none rounded-md bg-gradient-to-br from-[#4CAF50] to-[#388E3C] text-white font-semibold cursor-pointer text-[13px]"
                      : "py-2 px-4 border-none rounded-md bg-[#ccc] text-white font-semibold cursor-not-allowed text-[13px]"
                  }
                >
                  {sendTestLoading ? "Отправка…" : "Отправить отчёт в Telegram"}
                </button>
                {sendTestMessage && (
                  <span
                    className={`ml-3 text-[13px] ${
                      sendTestMessage.includes("отправлен")
                        ? "text-[#4CAF50]"
                        : "text-[#FF5252]"
                    }`}
                  >
                    {sendTestMessage}
                  </span>
                )}
              </div>
              {isAdmin && (
                <div className="mt-4 border-t border-[#ddd] pt-3">
                  <h4 className="m-0 mb-2 text-[13px] font-bold">
                    Время отправки (для всех)
                  </h4>
                  <div className="flex flex-wrap gap-3 items-center">
                    <label className="text-xs">
                      Ежедневно:{" "}
                      <Input
                        type="time"
                        value={form.report_daily_time}
                        onChange={(e) =>
                          setForm((f: any) => ({
                            ...f,
                            report_daily_time: e.target.value,
                          }))
                        }
                        className="py-1 rounded border border-[#ddd]"
                      />
                    </label>
                    <label className="text-xs">
                      Еженедельно:{" "}
                      <select
                        value={form.report_weekly_day}
                        onChange={(e) =>
                          setForm((f: any) => ({
                            ...f,
                            report_weekly_day: e.target.value,
                          }))
                        }
                        className="py-1 rounded border border-[#ddd]"
                      >
                        {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map(
                          (d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ),
                        )}
                      </select>{" "}
                      <Input
                        type="time"
                        value={form.report_weekly_time}
                        onChange={(e) =>
                          setForm((f: any) => ({
                            ...f,
                            report_weekly_time: e.target.value,
                          }))
                        }
                        className="py-1 rounded border border-[#ddd]"
                      />
                    </label>
                    <label className="text-xs">
                      Ежемесячно:{" "}
                      <select
                        value={form.report_monthly_day}
                        onChange={(e) =>
                          setForm((f: any) => ({
                            ...f,
                            report_monthly_day: e.target.value,
                          }))
                        }
                        className="py-1 rounded border border-[#ddd]"
                      >
                        <option value="last">Последний день</option>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(
                          (n) => (
                            <option key={n} value={String(n)}>
                              {n}
                            </option>
                          ),
                        )}
                      </select>{" "}
                      <Input
                        type="time"
                        value={form.report_monthly_time}
                        onChange={(e) =>
                          setForm((f: any) => ({
                            ...f,
                            report_monthly_time: e.target.value,
                          }))
                        }
                        className="py-1 rounded border border-[#ddd]"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="p-4 bg-[#f5f7fa] rounded-lg">
                <h4 className="m-0 mb-3 text-sm font-bold">
                  Сводный отчёт по выбранным менеджерам
                </h4>
                <p className="m-0 mb-3 text-xs text-[#666]">
                  Выберите, по каким менеджерам включать данные в сводный отчёт
                  в Telegram (опция «Получать отчеты по всем менеджерам»
                  настраивается в Управлении пользователями). Если никого не
                  выбрано — в сводку попадают все.
                </p>
                <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
                  {allUsers
                    .filter((u) => u.id !== user.id)
                    .map((u) => {
                      const name = getDisplayName(u) || u.username;
                      const checked =
                        form.report_managed_user_ids?.includes(u.id) ?? false;
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 text-[13px]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const ids: number[] =
                                form.report_managed_user_ids ?? [];
                              setForm((f: any) => ({
                                ...f,
                                report_managed_user_ids: e.target.checked
                                  ? [...ids, u.id]
                                  : ids.filter((id) => id !== u.id),
                              }));
                            }}
                          />
                          {name} ({u.username})
                        </label>
                      );
                    })}
                  {allUsers.length <= 1 && (
                    <span className="text-xs text-[#999]">
                      Нет других пользователей
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 bg-[#f5f7fa] rounded-lg">
              <h4 className="m-0 mb-3 text-sm font-bold">Email Отчеты</h4>
              <div className="mb-3">
                <label className="block mb-1 text-[13px] font-semibold">
                  Email адрес
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f: any) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full py-2 px-3 border border-[#ddd] rounded-md"
                  placeholder="Ваш Email"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.email_daily_report}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        email_daily_report: e.target.checked,
                      }))
                    }
                  />{" "}
                  Ежедневный отчет
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.email_weekly_report}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        email_weekly_report: e.target.checked,
                      }))
                    }
                  />{" "}
                  Еженедельный отчет
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.email_monthly_report}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        email_monthly_report: e.target.checked,
                      }))
                    }
                  />{" "}
                  Ежемесячный отчет
                </label>
              </div>
            </div>

            <div className="p-4 bg-[#f5f7fa] rounded-lg">
              <h4 className="m-0 mb-3 text-sm font-bold">Параметры отчетов</h4>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.report_detailed}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        report_detailed: e.target.checked,
                      }))
                    }
                  />{" "}
                  Подробный формат
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.report_include_call_summaries}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        report_include_call_summaries: e.target.checked,
                      }))
                    }
                  />{" "}
                  ИИ-саммари вызовов (Email)
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.report_include_avg_value}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        report_include_avg_value: e.target.checked,
                      }))
                    }
                  />{" "}
                  Средняя сумма сделки
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={form.report_include_avg_rating}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        report_include_avg_rating: e.target.checked,
                      }))
                    }
                  />{" "}
                  Средняя оценка качества
                </label>
              </div>

              <div className="mt-4 border-t border-[#ddd] pt-4">
                <h4 className="m-0 mb-3 text-sm font-bold">Настройки KPI</h4>
                <div className="flex flex-wrap gap-3 items-center mb-3">
                  <label className="text-[13px]">
                    Базовый оклад (₽):{" "}
                    <Input
                      type="number"
                      min={0}
                      value={form.kpi_base_salary}
                      onChange={(e) =>
                        setForm((f: any) => ({
                          ...f,
                          kpi_base_salary: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-[100px] py-1.5 px-2 border border-[#ddd] rounded"
                    />
                  </label>
                  <label className="text-[13px]">
                    Целевой бонус (₽):{" "}
                    <Input
                      type="number"
                      min={0}
                      value={form.kpi_target_bonus}
                      onChange={(e) =>
                        setForm((f: any) => ({
                          ...f,
                          kpi_target_bonus: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-[100px] py-1.5 px-2 border border-[#ddd] rounded"
                    />
                  </label>
                  <label className="text-[13px]">
                    Целевое время разговоров (мин):{" "}
                    <Input
                      type="number"
                      min={0}
                      value={form.kpi_target_talk_time_minutes}
                      onChange={(e) =>
                        setForm((f: any) => ({
                          ...f,
                          kpi_target_talk_time_minutes:
                            parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-[80px] py-1.5 px-2 border border-[#ddd] rounded"
                    />
                  </label>
                </div>
              </div>
              <div className="mt-4 border-t border-[#ddd] pt-4">
                <h4 className="m-0 mb-3 text-sm font-bold">
                  Исключения (фильтры)
                </h4>
                <label className="flex items-center gap-2 text-[13px] mb-2">
                  <input
                    type="checkbox"
                    checked={form.filter_exclude_answering_machine}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        filter_exclude_answering_machine: e.target.checked,
                      }))
                    }
                  />{" "}
                  Без автоответчиков
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[13px]">Короче (сек):</span>
                  <Input
                    type="number"
                    value={form.filter_min_duration}
                    onChange={(e) =>
                      setForm((f: any) => ({
                        ...f,
                        filter_min_duration: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-[60px] py-1 px-2 border border-[#ddd] rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className={
                saving
                  ? "py-2.5 px-6 border-none rounded-md bg-[#ccc] text-white font-semibold cursor-not-allowed"
                  : "py-2.5 px-6 border-none rounded-md bg-gradient-to-br from-[#FF6B35] to-[#F7931E] text-white font-semibold cursor-pointer"
              }
            >
              {saving ? "Сохранение…" : "Сохранить настройки"}
            </button>
            {message && (
              <span
                className={`text-sm font-medium ${
                  message.includes("Ошибка")
                    ? "text-[#FF5252]"
                    : "text-[#4CAF50]"
                }`}
              >
                {message}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
