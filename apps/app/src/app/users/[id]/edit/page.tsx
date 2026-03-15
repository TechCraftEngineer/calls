"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BasicInfoBlock,
  CheckboxBlock,
  EmailBlock,
  TelegramBlock,
} from "@/components/features/users/edit";
import type { EditUserForm } from "@/components/features/users/types";
import { useBlockStates } from "@/hooks/use-block-states";
import { useORPC } from "@/orpc/react";

export default function UserEditPage() {
  const params = useParams();
  const userId = params.id as string;
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<EditUserForm | null>(null);
  const [username, setUsername] = useState<string>("");

  const {
    clearBlockChanges,
    setBlockState,
    initializeForm,
    hasBlockChanges,
    getBlockState,
  } = useBlockStates();

  const {
    data,
    error: userError,
    isPending,
  } = useQuery({
    ...orpc.users.getForEdit.queryOptions({ input: { user_id: userId } }),
    enabled: !!userId,
  });

  useEffect(() => {
    if (data) {
      const { username: u, ...formData } = data;
      setUsername(u);
      const formValues = formData as EditUserForm;
      setForm(formValues);
      initializeForm(formValues);
    }
  }, [data, initializeForm]);

  const invalidateUser = () => {
    queryClient.invalidateQueries({
      queryKey: orpc.users.getForEdit.queryKey({ input: { user_id: userId } }),
    });
  };

  const updateBasicInfoMutation = useMutation(
    orpc.users.updateBasicInfo.mutationOptions({
      onSuccess: () => {
        setBlockState("basic", "success");
        clearBlockChanges("basic");
        invalidateUser();
      },
      onError: () => setBlockState("basic", "error"),
    }),
  );

  const updateTelegramMutation = useMutation(
    orpc.users.updateTelegramSettings.mutationOptions({
      onSuccess: () => {
        setBlockState("telegram", "success");
        clearBlockChanges("telegram");
        invalidateUser();
      },
      onError: () => setBlockState("telegram", "error"),
    }),
  );

  const disconnectTelegramMutation = useMutation(
    orpc.users.disconnectTelegram.mutationOptions({
      onSuccess: () => {
        setForm((f) => (f ? { ...f, telegramChatId: "" } : f));
        invalidateUser();
      },
    }),
  );

  const updateEmailMutation = useMutation(
    orpc.users.updateEmailSettings.mutationOptions({
      onSuccess: () => {
        setBlockState("email", "success");
        clearBlockChanges("email");
        invalidateUser();
      },
      onError: () => setBlockState("email", "error"),
    }),
  );

  const updateMaxMutation = useMutation(
    orpc.users.updateMaxSettings.mutationOptions({
      onSuccess: () => {
        setBlockState("max", "success");
        clearBlockChanges("max");
        invalidateUser();
      },
      onError: () => setBlockState("max", "error"),
    }),
  );

  const updateReportMutation = useMutation(
    orpc.users.updateReportSettings.mutationOptions({
      onSuccess: () => {
        setBlockState("reports", "success");
        clearBlockChanges("reports");
        invalidateUser();
      },
      onError: () => setBlockState("reports", "error"),
    }),
  );

  const updateKpiMutation = useMutation(
    orpc.users.updateKpiSettings.mutationOptions({
      onSuccess: () => {
        setBlockState("kpi", "success");
        clearBlockChanges("kpi");
        invalidateUser();
      },
      onError: () => setBlockState("kpi", "error"),
    }),
  );

  const updateFilterMutation = useMutation(
    orpc.users.updateFilterSettings.mutationOptions({
      onSuccess: () => {
        setBlockState("filters", "success");
        clearBlockChanges("filters");
        invalidateUser();
      },
      onError: () => setBlockState("filters", "error"),
    }),
  );

  const handleSaveBasicInfo = () => {
    if (!form) return;
    setBlockState("basic", "saving");
    updateBasicInfoMutation.mutate({
      user_id: userId,
      data: {
        givenName: form.givenName,
        familyName: form.familyName,
        internalExtensions: form.internalExtensions,
        mobilePhones: form.mobilePhones,
      },
    });
  };

  const handleSaveTelegramSettings = () => {
    if (!form) return;
    setBlockState("telegram", "saving");
    updateTelegramMutation.mutate({
      user_id: userId,
      data: {
        telegram_daily_report: form.telegram_daily_report,
        telegram_manager_report: form.telegram_manager_report,
        telegram_weekly_report: form.telegram_weekly_report,
        telegram_monthly_report: form.telegram_monthly_report,
      },
    });
  };

  const handleDisconnectTelegram = () => {
    if (!form) return;
    disconnectTelegramMutation.mutate({ user_id: userId });
  };

  const handleSaveEmailSettings = () => {
    if (!form) return;
    setBlockState("email", "saving");
    updateEmailMutation.mutate({
      user_id: userId,
      data: {
        email: form.email,
        email_daily_report: form.email_daily_report,
        email_weekly_report: form.email_weekly_report,
        email_monthly_report: form.email_monthly_report,
      },
    });
  };

  const handleSaveMaxSettings = () => {
    if (!form) return;
    setBlockState("max", "saving");
    updateMaxMutation.mutate({
      user_id: userId,
      data: {
        max_daily_report: form.max_daily_report,
        max_manager_report: form.max_manager_report,
      },
    });
  };

  const handleSaveReportSettings = () => {
    if (!form) return;
    setBlockState("reports", "saving");
    updateReportMutation.mutate({
      user_id: userId,
      data: {
        report_include_call_summaries: form.report_include_call_summaries,
        report_detailed: form.report_detailed,
        report_include_avg_value: form.report_include_avg_value,
        report_include_avg_rating: form.report_include_avg_rating,
      },
    });
  };

  const handleSaveKpiSettings = () => {
    if (!form) return;
    setBlockState("kpi", "saving");
    updateKpiMutation.mutate({
      user_id: userId,
      data: {
        kpi_base_salary: form.kpi_base_salary,
        kpi_target_bonus: form.kpi_target_bonus,
        kpi_target_talk_time_minutes: form.kpi_target_talk_time_minutes,
      },
    });
  };

  const handleSaveFilterSettings = () => {
    if (!form) return;
    setBlockState("filters", "saving");
    updateFilterMutation.mutate({
      user_id: userId,
      data: {
        filter_exclude_answering_machine: form.filter_exclude_answering_machine,
        filter_min_duration: form.filter_min_duration,
        filter_min_replicas: form.filter_min_replicas,
      },
    });
  };

  if (userError) {
    return <div>Ошибка загрузки пользователя</div>;
  }

  if (isPending || !form) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div>
            <h1 className="page-title">Редактирование пользователя</h1>
            <p className="page-subtitle mt-1 text-sm text-[#999]">
              Логин: {username}
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
