"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BasicInfoBlock,
  CheckboxBlock,
  EmailBlock,
  TelegramBlock,
} from "@/components/features/users/edit";
import type {
  EditUserForm,
  ManagedUser,
} from "@/components/features/users/types";
import { useBlockStates } from "@/hooks/use-block-states";

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
    filter_min_duration: u.filter_min_duration || 0,
    filter_min_replicas: u.filter_min_replicas || 0,
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

export default function UserEditPage() {
  const params = useParams();
  const userId = params.id as string;

  const [form, setForm] = useState<EditUserForm | null>(null);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);

  const {
    clearBlockChanges,
    setBlockState,
    initializeForm,
    updateOriginalForm,
    hasBlockChanges,
    getBlockState,
  } = useBlockStates();

  // Загрузка данных пользователя
  const { data: user, error: userError } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      // Заглушка для API вызова
      return null;
    },
  });

  useEffect(() => {
    if (user) {
      const managedUser = user as ManagedUser;
      setEditUser(managedUser);
      const newForm = buildEditForm(managedUser);
      setForm(newForm);
      initializeForm(newForm);
    }
  }, [user, initializeForm]);

  const handleSaveBasicInfo = async () => {
    if (!form) return;

    setBlockState("basic", "saving");
    try {
      // Заглушка для API вызова
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setBlockState("basic", "success");
      clearBlockChanges("basic");
      updateOriginalForm(form);
      console.log("Сохранено:", form);
    } catch (err) {
      setBlockState("basic", "error");
      console.error("Ошибка сохранения:", err);
    }
  };

  const handleSaveTelegramSettings = async () => {
    if (!form) return;

    setBlockState("telegram", "saving");
    try {
      // Заглушка для API вызова
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setBlockState("telegram", "success");
      clearBlockChanges("telegram");
      updateOriginalForm(form);
      console.log("Сохранено Telegram:", form);
    } catch (err) {
      setBlockState("telegram", "error");
      console.error("Ошибка сохранения Telegram:", err);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!form) return;

    try {
      // Заглушка для API вызова
      await new Promise((resolve) => setTimeout(resolve, 500));
      setForm({ ...form, telegramChatId: "" });
      console.log("Telegram отвязан");
    } catch (err) {
      console.error("Ошибка отвязки Telegram:", err);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!form) return;

    setBlockState("email", "saving");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setBlockState("email", "success");
      clearBlockChanges("email");
      updateOriginalForm(form);
      console.log("Сохранено Email:", form);
    } catch (err) {
      setBlockState("email", "error");
      console.error("Ошибка сохранения Email:", err);
    }
  };

  const handleSaveMaxSettings = async () => {
    if (!form) return;

    setBlockState("max", "saving");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setBlockState("max", "success");
      clearBlockChanges("max");
      updateOriginalForm(form);
      console.log("Сохранено MAX:", form);
    } catch (err) {
      setBlockState("max", "error");
      console.error("Ошибка сохранения MAX:", err);
    }
  };

  const handleSaveReportSettings = async () => {
    if (!form) return;

    setBlockState("reports", "saving");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setBlockState("reports", "success");
      clearBlockChanges("reports");
      updateOriginalForm(form);
      console.log("Сохранено отчеты:", form);
    } catch (err) {
      setBlockState("reports", "error");
      console.error("Ошибка сохранения отчетов:", err);
    }
  };

  const handleSaveKpiSettings = async () => {
    if (!form) return;

    setBlockState("kpi", "saving");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setBlockState("kpi", "success");
      clearBlockChanges("kpi");
      updateOriginalForm(form);
      console.log("Сохранено KPI:", form);
    } catch (err) {
      setBlockState("kpi", "error");
      console.error("Ошибка сохранения KPI:", err);
    }
  };

  const handleSaveFilterSettings = async () => {
    if (!form) return;

    setBlockState("filters", "saving");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setBlockState("filters", "success");
      clearBlockChanges("filters");
      updateOriginalForm(form);
      console.log("Сохранено фильтры:", form);
    } catch (err) {
      setBlockState("filters", "error");
      console.error("Ошибка сохранения фильтров:", err);
    }
  };

  if (userError) {
    return <div>Ошибка загрузки пользователя</div>;
  }

  if (!form || !editUser) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div>
            <h1 className="page-title">Редактирование пользователя</h1>
            <p className="page-subtitle mt-1 text-sm text-[#999]">
              Логин: {String(editUser.username ?? "")}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl">
          <BasicInfoBlock
            form={form}
            setForm={setForm}
            hasChanges={hasBlockChanges("basic")}
            isSaving={getBlockState("basic") === "saving"}
            state={getBlockState("basic")}
            onSave={handleSaveBasicInfo}
            disabled={false}
          />

          <TelegramBlock
            form={form}
            setForm={setForm}
            hasChanges={hasBlockChanges("telegram")}
            isSaving={getBlockState("telegram") === "saving"}
            state={getBlockState("telegram")}
            onSave={handleSaveTelegramSettings}
            disabled={false}
            onDisconnect={handleDisconnectTelegram}
          />

          <EmailBlock
            form={form}
            setForm={setForm}
            hasChanges={hasBlockChanges("email")}
            isSaving={getBlockState("email") === "saving"}
            state={getBlockState("email")}
            onSave={handleSaveEmailSettings}
            disabled={false}
          />

          <CheckboxBlock
            title="MAX Отчеты"
            form={form}
            setForm={setForm}
            fields={["max_daily_report", "max_manager_report"]}
            labels={[
              "Получать свои ежедневные отчеты (MAX)",
              "Получать отчеты по всем менеджерам (MAX)",
            ]}
            hasChanges={hasBlockChanges("max")}
            isSaving={getBlockState("max") === "saving"}
            state={getBlockState("max")}
            onSave={handleSaveMaxSettings}
            disabled={false}
          />

          <CheckboxBlock
            title="Параметры отчетов"
            form={form}
            setForm={setForm}
            fields={[
              "report_include_call_summaries",
              "report_detailed",
              "report_include_avg_value",
              "report_include_avg_rating",
            ]}
            labels={[
              "Включать тексты звонков",
              "Детальный отчет",
              "Включать среднюю длительность",
              "Включать среднюю оценку",
            ]}
            hasChanges={hasBlockChanges("reports")}
            isSaving={getBlockState("reports") === "saving"}
            state={getBlockState("reports")}
            onSave={handleSaveReportSettings}
            disabled={false}
          />

          <CheckboxBlock
            title="Настройки KPI"
            form={form}
            setForm={setForm}
            fields={[
              "kpi_base_salary",
              "kpi_target_bonus",
              "kpi_target_talk_time_minutes",
            ]}
            labels={[
              "Базовый оклад",
              "Целевой бонус",
              "Целевое время разговора (минуты)",
            ]}
            hasChanges={hasBlockChanges("kpi")}
            isSaving={getBlockState("kpi") === "saving"}
            state={getBlockState("kpi")}
            onSave={handleSaveKpiSettings}
            disabled={false}
          />

          <CheckboxBlock
            title="Исключить из отчётов"
            form={form}
            setForm={setForm}
            fields={[
              "filter_exclude_answering_machine",
              "filter_min_duration",
              "filter_min_replicas",
            ]}
            labels={[
              "Исключить автоответчик",
              "Минимальная длительность разговора (секунды)",
              "Минимальное количество реплик",
            ]}
            hasChanges={hasBlockChanges("filters")}
            isSaving={getBlockState("filters") === "saving"}
            state={getBlockState("filters")}
            onSave={handleSaveFilterSettings}
            disabled={false}
          />
        </div>
      </main>
    </div>
  );
}
