"use client";

import { Button, Input } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EditUserForm,
  ManagedUser,
} from "@/components/features/users/types";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { useToast } from "@/components/ui/toast";
import { getCurrentUser, type User } from "@/lib/auth";
import { useORPC } from "@/orpc/react";
import { useUserFormValidation } from "@/hooks/use-user-form-validation";
import { useDebouncedCallback } from "@/hooks/use-debounce-callback";

function buildEditForm(u: ManagedUser): EditUserForm {
  return {
    givenName: u.givenName || "",
    familyName: u.familyName || "",
    internalExtensions: u.internalExtensions || "",
    mobilePhones: u.mobilePhones || "",
    telegramChatId: u.telegramChatId || "",
    telegram_daily_report: u.telegram_daily_report || false,
    telegram_manager_report: u.telegram_manager_report || false,
    max_chat_id: u.max_chat_id || "",
    max_daily_report: u.max_daily_report || false,
    max_manager_report: u.max_manager_report || false,
    filter_exclude_answering_machine:
      u.filter_exclude_answering_machine || false,
    filter_min_duration: u.filter_min_duration ?? 0,
    filter_min_replicas: u.filter_min_replicas ?? 0,
    email: u.email || "",
    email_daily_report: u.email_daily_report || false,
    email_weekly_report: u.email_weekly_report || false,
    email_monthly_report: u.email_monthly_report || false,
    telegram_weekly_report: u.telegram_weekly_report || false,
    telegram_monthly_report: u.telegram_monthly_report || false,
    report_include_call_summaries: u.report_include_call_summaries || false,
    report_detailed: u.report_detailed || false,
    report_include_avg_value: u.report_include_avg_value || false,
    report_include_avg_rating: u.report_include_avg_rating || false,
    kpi_base_salary: u.kpi_base_salary || 0,
    kpi_target_bonus: u.kpi_target_bonus || 0,
    kpi_target_talk_time_minutes: u.kpi_target_talk_time_minutes || 0,
  };
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { validateForm, clearErrors, getFirstError } = useUserFormValidation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const userId = params.id as string;

  const {
    data: user,
    isPending: loading,
    error: userError,
  } = useQuery(orpc.users.get.queryOptions({ input: { user_id: userId } }));

  const [form, setForm] = useState<EditUserForm>(() =>
    user
      ? buildEditForm(user as ManagedUser)
      : {
          givenName: "",
          familyName: "",
          internalExtensions: "",
          mobilePhones: "",
          telegramChatId: "",
          telegram_daily_report: false,
          telegram_manager_report: false,
          max_chat_id: "",
          max_daily_report: false,
          max_manager_report: false,
          filter_exclude_answering_machine: false,
          filter_min_duration: 0,
          filter_min_replicas: 0,
          email: "",
          email_daily_report: false,
          email_weekly_report: false,
          email_monthly_report: false,
          telegram_weekly_report: false,
          telegram_monthly_report: false,
          report_include_call_summaries: false,
          report_detailed: false,
          report_include_avg_value: false,
          report_include_avg_rating: false,
          kpi_base_salary: 0,
          kpi_target_bonus: 0,
          kpi_target_talk_time_minutes: 0,
        },
  );
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) {
        router.push("/auth/signin");
        return;
      }
      setCurrentUser(user);
    });
  }, [router]);

  useEffect(() => {
    if (user) {
      const managedUser = user as ManagedUser;
      setEditUser(managedUser);
      setForm(buildEditForm(managedUser));
    }
  }, [user]);

  useEffect(() => {
    if (
      userError &&
      typeof userError === "object" &&
      "code" in userError &&
      (userError as { code?: string }).code === "FORBIDDEN"
    ) {
      router.push("/forbidden");
    }
  }, [userError, router]);

  const updateMutation = useMutation(
    orpc.users.update.mutationOptions({
      onSuccess: () => {
        showToast("Пользователь успешно обновлен", "success");
        router.push("/users");
      },
      onError: (err) => {
        showToast(err.message || "Ошибка при обновлении пользователя", "error");
      },
    }),
  );

  const disconnectTelegramMutation = useMutation(
    orpc.users.disconnectTelegram.mutationOptions({
      onSuccess: () => {
        setForm((f) => ({ ...f, telegramChatId: "" }));
        if (editUser) {
          setEditUser({ ...editUser, telegramChatId: "" });
        }
        showToast("Telegram отвязан", "success");
      },
      onError: () => showToast("Ошибка при отвязке Telegram", "error"),
    }),
  );

  const disconnectMaxMutation = useMutation(
    orpc.users.disconnectMax.mutationOptions({
      onSuccess: () => {
        setForm((f) => ({ ...f, max_chat_id: "" }));
        if (editUser) {
          setEditUser({ ...editUser, max_chat_id: "" });
        }
        showToast("MAX отвязан", "success");
      },
      onError: () => showToast("Ошибка при отвязке MAX", "error"),
    }),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    
    // Валидация формы
    const validationErrors = validateForm(form);
    if (validationErrors.length > 0) {
      setError(getFirstError());
      return;
    }
    
    setSubmitting(true);
    try {
      await updateMutation.mutateAsync({
        user_id: userId,
        data: {
          givenName: form.givenName.trim(),
          familyName: form.familyName.trim() || undefined,
          internalExtensions: form.internalExtensions.trim() || undefined,
          mobilePhones: form.mobilePhones.trim() || undefined,
          email: form.email.trim() || undefined,
          filter_exclude_answering_machine:
            form.filter_exclude_answering_machine,
          filter_min_duration: Math.max(0, form.filter_min_duration),
          filter_min_replicas: Math.max(0, form.filter_min_replicas),
          telegram_daily_report: form.telegram_daily_report,
          telegram_manager_report: form.telegram_manager_report,
          telegram_weekly_report: form.telegram_weekly_report,
          telegram_monthly_report: form.telegram_monthly_report,
          email_daily_report: form.email_daily_report,
          email_weekly_report: form.email_weekly_report,
          email_monthly_report: form.email_monthly_report,
          report_include_call_summaries: form.report_include_call_summaries,
          report_detailed: form.report_detailed,
          report_include_avg_value: form.report_include_avg_value,
          report_include_avg_rating: form.report_include_avg_rating,
          kpi_base_salary: Math.max(0, form.kpi_base_salary || 0),
          kpi_target_bonus: Math.max(0, form.kpi_target_bonus || 0),
          kpi_target_talk_time_minutes: Math.max(0, form.kpi_target_talk_time_minutes || 0),
        },
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Ошибка при сохранении";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const telegramAuthUrlMutation = useMutation(
    orpc.users.telegramAuthUrl.mutationOptions({
      onSuccess: (res) => {
        if (res.url) {
          window.open(res.url, "_blank");
        }
      },
      onError: () =>
        showToast("Ошибка при создании ссылки для Telegram", "error"),
    }),
  );

  const maxAuthUrlMutation = useMutation(
    orpc.users.maxAuthUrl.mutationOptions({
      onSuccess: (res) => {
        const url = "url" in res ? res.url : undefined;
        if (typeof url === "string") {
          window.open(url, "_blank");
        } else if (res.manual_instruction) {
          const cmd =
            res.manual_instruction.split(": ")[1] ?? res.manual_instruction;
          showToast(`Для подключения отправьте боту команду:\n${cmd}`, "info");
        }
      },
      onError: () => showToast("Ошибка при создании ссылки для MAX", "error"),
    }),
  );

  const handleDisconnectTelegram = useCallback(() => {
    if (!confirm("Отвязать Telegram аккаунт?")) return;
    disconnectTelegramMutation.mutate({ user_id: userId });
  }, [userId, disconnectTelegramMutation]);

  const handleConnectTelegram = useCallback(() => {
    telegramAuthUrlMutation.mutate({ user_id: userId });
  }, [userId, telegramAuthUrlMutation]);

  const handleCheckTelegramConnection = useDebouncedCallback(async () => {
    try {
      const updated = await queryClient.fetchQuery(
        orpc.users.get.queryOptions({ input: { user_id: userId } }),
      );
      if (updated) {
        const managedUser = updated as ManagedUser;
        setEditUser(managedUser);
        setForm((f) => ({
          ...f,
          telegramChatId: managedUser.telegramChatId || "",
          filter_exclude_answering_machine:
            managedUser.filter_exclude_answering_machine || false,
          filter_min_duration: Math.max(0, managedUser.filter_min_duration ?? 0),
          filter_min_replicas: Math.max(0, managedUser.filter_min_replicas ?? 0),
        }));
      }
    } catch (_e) {
      showToast("Ошибка при проверке подключения", "error");
    }
  }, 1000); // Debounce на 1 секунду

  const handleDisconnectMax = useCallback(() => {
    if (!confirm("Отвязать MAX аккаунт?")) return;
    disconnectMaxMutation.mutate({ user_id: userId });
  }, [userId, disconnectMaxMutation]);

  const handleConnectMax = useCallback(() => {
    maxAuthUrlMutation.mutate({ user_id: userId });
  }, [userId, maxAuthUrlMutation]);

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar user={currentUser} />
        <Header user={currentUser} />
        <main className="main-content">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Загрузка...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!editUser) {
    return (
      <div className="app-container">
        <Sidebar user={currentUser} />
        <Header user={currentUser} />
        <main className="main-content">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-600">Пользователь не найден</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar user={currentUser} />
      <Header user={currentUser} />

      <main className="main-content">
        <header className="page-header mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push("/users")}
              className="flex items-center gap-2"
            >
              ← Назад к пользователям
            </Button>
            <div>
              <h1 className="page-title">Редактирование пользователя</h1>
              <p className="page-subtitle mt-1 text-sm text-[#999]">
                Логин: {String(editUser.username ?? "")}
              </p>
            </div>
          </div>
        </header>

        <div className="max-w-4xl">
          <form onSubmit={handleSubmit}>
            {error ? (
              <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{String(error)}</p>
              </div>
            ) : null}

            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">
                Основная информация
              </h2>

              {/* Основные поля */}
              <div className="mb-4">
                <label className="block mb-1 text-[13px] font-semibold">
                  Имя *
                </label>
                <Input
                  type="text"
                  value={form.givenName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, givenName: e.target.value }))
                  }
                  className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-[13px] font-semibold">
                  Фамилия
                </label>
                <Input
                  type="text"
                  value={form.familyName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, familyName: e.target.value }))
                  }
                  className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-[13px] font-semibold">
                  Внутренние номера
                </label>
                <Input
                  type="text"
                  value={form.internalExtensions}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      internalExtensions: e.target.value,
                    }))
                  }
                  className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                  placeholder="101, 102 или admin, ovchinnikov_nikita (МегаФон)"
                />
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-[13px] font-semibold">
                  Мобильные номера
                </label>
                <Input
                  type="text"
                  value={form.mobilePhones}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mobilePhones: e.target.value }))
                  }
                  className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                  placeholder="79XXXXXXXXX, можно несколько через запятую"
                />
              </div>
            </div>

            {/* Telegram */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Telegram</h2>

              <div className="mb-4">
                <label className="block mb-1 text-[13px] font-semibold">
                  Telegram Chat ID
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={form.telegramChatId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, telegramChatId: e.target.value }))
                    }
                    className="flex-1 py-2 px-3 border border-[#ddd] rounded-md box-border"
                    placeholder="ID чата пользователя"
                  />
                </div>
                <div className="mt-2">
                  {editUser.telegramChatId ? (
                    <button
                      type="button"
                      onClick={handleDisconnectTelegram}
                      className="text-sm text-red-600 bg-white border border-red-600 rounded-md px-3 py-1.5 hover:bg-red-50"
                    >
                      Отвязать Telegram
                    </button>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleConnectTelegram}
                        className="text-sm text-blue-600 bg-white border border-blue-600 rounded-md px-3 py-1.5 hover:bg-blue-50 flex items-center gap-1"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.48-.94-2.4-1.54-1.06-.7-.37-1.09.23-1.72.16-.16 2.87-2.63 2.92-2.85.01-.03.01-.14-.06-.2-.06-.05-.16-.03-.24-.01-.34.08-5.34 3.45-5.56 3.6-.32.22-.6.33-.85.33-.28-.01-.81-.26-1.2-.56-.48-.38-.86-.58-.82-1.23.02-.34.49-.69 1.28-1.05 5.03-2.18 8.38-3.62 10.04-4.3 2.8-1.16 3.38-1.36 3.76-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z" />
                        </svg>
                        Подключить Telegram
                      </button>
                      <button
                        type="button"
                        onClick={handleCheckTelegramConnection}
                        className="text-sm text-gray-600 bg-white border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
                      >
                        Проверить подключение
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {(
                  [
                    ["telegram_daily_report", "Ежедневный отчет"],
                    ["telegram_weekly_report", "Еженедельный отчет"],
                    ["telegram_monthly_report", "Ежемесячный отчет"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.checked }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* MAX Отчеты */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">MAX Отчеты</h2>

              <div className="mb-4">
                <label className="block mb-1 text-[13px] font-semibold">
                  MAX Chat ID
                </label>
                <Input
                  type="text"
                  value={form.max_chat_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, max_chat_id: e.target.value }))
                  }
                  className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                  placeholder="ID чата MAX"
                />
              </div>

              <div className="mb-4">
                {editUser.max_chat_id ? (
                  <button
                    type="button"
                    onClick={handleDisconnectMax}
                    className="text-sm text-red-600 bg-white border border-red-600 rounded-md px-3 py-1.5 hover:bg-red-50"
                  >
                    Отвязать MAX
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectMax}
                    className="text-sm text-purple-600 bg-white border border-purple-600 rounded-md px-3 py-1.5 hover:bg-purple-50 flex items-center gap-1"
                  >
                    <span className="text-base">⚡</span> Подключить MAX
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(["max_daily_report", "max_manager_report"] as const).map(
                  (key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: e.target.checked }))
                        }
                      />
                      {key === "max_daily_report"
                        ? "Получать свои ежедневные отчеты (MAX)"
                        : "Получать отчеты по всем менеджерам (MAX)"}
                    </label>
                  ),
                )}
              </div>
            </div>

            {/* Email Отчеты */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Email Отчеты</h2>

              <div className="mb-4">
                <label className="block mb-1 text-[13px] font-semibold">
                  Email адрес
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                  placeholder="otchet@mail.com"
                />
              </div>

              <div className="space-y-2">
                {(
                  [
                    ["email_daily_report", "Ежедневный отчет"],
                    ["email_weekly_report", "Еженедельный отчет"],
                    ["email_monthly_report", "Ежемесячный отчет"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.checked }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Параметры отчетов */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Параметры отчетов</h2>

              <div className="space-y-2">
                {(
                  [
                    ["report_detailed", "Подробный отчет (доп. метрики)"],
                    [
                      "report_include_call_summaries",
                      "Включать ИИ-саммари звонков (Email)",
                    ],
                    ["report_include_avg_value", "Средняя сумма сделки"],
                    ["report_include_avg_rating", "Средняя оценка качества"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.checked }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Настройки KPI */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Настройки KPI</h2>

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
                <div key={key} className="mb-4">
                  <label className="block mb-1 text-[13px] font-semibold">
                    {label}
                  </label>
                  <Input
                    type="number"
                    value={form[key]}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setForm((f) => ({
                        ...f,
                        [key]: isNaN(value) ? 0 : Math.max(0, value),
                      }))
                    }}
                    className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                  />
                </div>
              ))}
            </div>

            {/* Исключить из отчётов */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">
                Исключить из отчётов
              </h2>

              <label className="flex items-center gap-2 text-sm cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={form.filter_exclude_answering_machine}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      filter_exclude_answering_machine: e.target.checked,
                    }))
                  }
                />
                Автоответчики
              </label>

              <div className="mb-4">
                <label className="block mb-1 text-[13px] font-semibold">
                  Звонки короче (сек)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.filter_min_duration ?? ""}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setForm((f) => ({
                      ...f,
                      filter_min_duration: isNaN(value) ? 0 : Math.max(0, value),
                    }))
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
                    setForm((f) => ({
                      ...f,
                      filter_min_replicas: isNaN(value) ? 0 : Math.max(0, value),
                    }))
                  }}
                  className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                  placeholder="0 — не исключать"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/users")}
                disabled={submitting}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                {submitting ? "Сохранение…" : "Сохранить"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
