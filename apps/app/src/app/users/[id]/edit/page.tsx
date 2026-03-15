"use client";

import { paths } from "@calls/config";
import { Button, toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BasicInfoBlock,
  CheckboxBlock,
  EmailBlock,
  EvaluationBlock,
  KpiBlock,
  TelegramBlock,
} from "@/components/features/users/edit";
import type { EditUserForm } from "@/components/features/users/types";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { useBlockStates } from "@/hooks/use-block-states";
import { getCurrentUser, type User } from "@/lib/auth";
import { useORPC } from "@/orpc/react";

export default function UserEditPage() {
  const params = useParams();
  const userId = params.id as string;
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form, setForm] = useState<EditUserForm | null>(null);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
  }, []);

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
    isFetching,
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

  const telegramAuthUrlMutation = useMutation(
    orpc.users.telegramAuthUrl.mutationOptions({
      onSuccess: (res: { url?: string }) => {
        if (res?.url) {
          window.open(res.url, "_blank");
          toast.success(
            "Откройте Telegram и нажмите «Старт» в чате с ботом. Затем нажмите «Проверить подключение».",
          );
        } else {
          toast.error("Не удалось получить ссылку для подключения");
        }
      },
      onError: () => toast.error("Ошибка при создании ссылки для Telegram"),
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

  const updateEvaluationMutation = useMutation(
    orpc.users.updateEvaluationSettings.mutationOptions({
      onSuccess: () => {
        setBlockState("evaluation", "success");
        clearBlockChanges("evaluation");
        invalidateUser();
      },
      onError: () => setBlockState("evaluation", "error"),
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

  const handleConnectTelegram = () => {
    telegramAuthUrlMutation.mutate({ user_id: userId });
  };

  const handleCheckTelegramConnection = () => {
    invalidateUser();
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

  const handleSaveEvaluationSettings = () => {
    if (!form) return;
    setBlockState("evaluation", "saving");
    updateEvaluationMutation.mutate({
      user_id: userId,
      data: {
        evaluation_template_slug: form.evaluation_template_slug,
        evaluation_custom_instructions: form.evaluation_custom_instructions,
      },
    });
  };

  if (userError) {
    return (
      <div className="app-container">
        <Sidebar user={currentUser} />
        <Header user={currentUser} />
        <main className="main-content">
          <div className="p-6">
            <p className="text-destructive">Ошибка загрузки пользователя</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href={paths.users.root}>← К списку пользователей</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (isPending || !form) {
    return (
      <div className="app-container">
        <Sidebar user={currentUser} />
        <Header user={currentUser} />
        <main className="main-content">
          <div className="p-6">
            <div className="animate-pulse h-8 bg-gray-200 rounded w-48 mb-4" />
            <div className="animate-pulse h-4 bg-gray-100 rounded w-full max-w-md" />
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
        <header className="page-header mb-6 flex justify-between items-start">
          <div>
            <h1 className="page-title">Редактирование пользователя</h1>
            <p className="page-subtitle mt-1 text-sm text-[#999]">
              Логин: {username}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={paths.users.root}>← К списку пользователей</Link>
          </Button>
        </header>

        <div className="max-w-4xl">
          <BasicInfoBlock
            form={form}
            setForm={setForm}
            hasChanges={hasBlockChanges("basic", form)}
            isSaving={getBlockState("basic") === "saving"}
            state={getBlockState("basic")}
            onSave={handleSaveBasicInfo}
            disabled={false}
          />

          <TelegramBlock
            form={form}
            setForm={setForm}
            hasChanges={hasBlockChanges("telegram", form)}
            isSaving={getBlockState("telegram") === "saving"}
            state={getBlockState("telegram")}
            onSave={handleSaveTelegramSettings}
            disabled={false}
            onDisconnect={handleDisconnectTelegram}
            onConnect={handleConnectTelegram}
            onCheckConnection={handleCheckTelegramConnection}
            connectLoading={telegramAuthUrlMutation.isPending}
            checkConnectionLoading={isFetching && !isPending}
          />

          <EmailBlock
            form={form}
            setForm={setForm}
            hasChanges={hasBlockChanges("email", form)}
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
            hasChanges={hasBlockChanges("max", form)}
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
            hasChanges={hasBlockChanges("reports", form)}
            isSaving={getBlockState("reports") === "saving"}
            state={getBlockState("reports")}
            onSave={handleSaveReportSettings}
            disabled={false}
          />

          <KpiBlock
            form={form}
            setForm={setForm}
            hasChanges={hasBlockChanges("kpi", form)}
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
            hasChanges={hasBlockChanges("filters", form)}
            isSaving={getBlockState("filters") === "saving"}
            state={getBlockState("filters")}
            onSave={handleSaveFilterSettings}
            disabled={false}
          />

          <EvaluationBlock
            form={form}
            setForm={setForm}
            hasChanges={hasBlockChanges("evaluation", form)}
            isSaving={getBlockState("evaluation") === "saving"}
            state={getBlockState("evaluation")}
            onSave={handleSaveEvaluationSettings}
            disabled={false}
          />
        </div>
      </main>
    </div>
  );
}
