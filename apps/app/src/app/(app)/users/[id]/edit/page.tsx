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
import { useBlockStates } from "@/hooks/use-block-states";
import { useSession } from "@/lib/better-auth";
import { useORPC } from "@/orpc/react";

export default function UserEditPage() {
  const params = useParams();
  const userId = params.id as string;
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<EditUserForm | null>(null);
  const [email, setEmail] = useState<string>("");

  const { data: session, isPending: sessionPending } = useSession();
  const _user = session?.user ?? null;
  const _userLoading = sessionPending;

  const { clearBlockChanges, setBlockState, initializeForm, hasBlockChanges, getBlockState } =
    useBlockStates();

  const {
    data,
    error: userError,
    isPending,
    isFetching,
  } = useQuery({
    ...orpc.users.getForEdit.queryOptions({ input: { userId: userId } }),
    enabled: !!userId,
  });

  useEffect(() => {
    if (data) {
      const { email: e, ...formData } = data;
      setEmail(e);
      const formValues = {
        ...formData,
        email: e,
      } as EditUserForm;
      setForm(formValues);
      initializeForm(formValues);
    }
  }, [data, initializeForm]);

  const invalidateUser = () => {
    queryClient.invalidateQueries({
      queryKey: orpc.users.getForEdit.queryKey({ input: { userId: userId } }),
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
      userId: userId,
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
      userId: userId,
      data: {
        telegramDailyReport: form.telegramDailyReport,
        telegramManagerReport: form.telegramManagerReport,
        telegramWeeklyReport: form.telegramWeeklyReport,
        telegramMonthlyReport: form.telegramMonthlyReport,
      },
    });
  };

  const handleDisconnectTelegram = () => {
    if (!form) return;
    disconnectTelegramMutation.mutate({ userId: userId });
  };

  const handleConnectTelegram = () => {
    telegramAuthUrlMutation.mutate({ userId: userId });
  };

  const handleCheckTelegramConnection = () => {
    invalidateUser();
  };

  const handleSaveEmailSettings = () => {
    if (!form) return;
    setBlockState("email", "saving");
    updateEmailMutation.mutate({
      userId: userId,
      data: {
        email: form.email,
        emailDailyReport: form.emailDailyReport,
        emailWeeklyReport: form.emailWeeklyReport,
        emailMonthlyReport: form.emailMonthlyReport,
      },
    });
  };

  const handleSaveMaxSettings = () => {
    if (!form) return;
    setBlockState("max", "saving");
    updateMaxMutation.mutate({
      userId: userId,
      data: {
        maxChatId: form.maxChatId,
        maxDailyReport: form.maxDailyReport,
        maxManagerReport: form.maxManagerReport,
      },
    });
  };

  const handleSaveKpiSettings = () => {
    if (!form) return;
    setBlockState("kpi", "saving");
    updateKpiMutation.mutate({
      userId: userId,
      data: {
        kpiBaseSalary: form.kpiBaseSalary,
        kpiTargetBonus: form.kpiTargetBonus,
        kpiTargetTalkTimeMinutes: form.kpiTargetTalkTimeMinutes,
      },
    });
  };

  const handleSaveFilterSettings = () => {
    if (!form) return;
    setBlockState("filters", "saving");
    updateFilterMutation.mutate({
      userId: userId,
      data: {
        filterExcludeAnsweringMachine: form.filterExcludeAnsweringMachine,
        filterMinDuration: form.filterMinDuration,
        filterMinReplicas: form.filterMinReplicas,
      },
    });
  };

  const handleSaveEvaluationSettings = () => {
    if (!form) return;
    setBlockState("evaluation", "saving");
    updateEvaluationMutation.mutate({
      userId: userId,
      data: {
        evaluationTemplateSlug: form.evaluationTemplateSlug,
        evaluationCustomInstructions: form.evaluationCustomInstructions,
      },
    });
  };

  if (userError) {
    return (
      <main className="main-content">
        <div className="p-6">
          <p className="text-destructive">Ошибка загрузки пользователя</p>
          <Button variant="link" size="sm" className="mt-4 text-foreground" asChild>
            <Link href={paths.users.root}>← К списку пользователей</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (isPending || !form) {
    return (
      <main className="main-content">
        <div className="p-6">
          <div className="animate-pulse h-8 bg-gray-200 rounded w-48 mb-4" />
          <div className="animate-pulse h-4 bg-gray-100 rounded w-full max-w-md" />
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <header className="page-header mb-6 flex justify-between items-start">
        <div>
          <h1 className="page-title">Редактирование пользователя</h1>
          <p className="page-subtitle mt-1 text-sm text-[#999]">Email: {email}</p>
        </div>
        <Button variant="link" size="sm" className="text-foreground" asChild>
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
          fields={["maxDailyReport", "maxManagerReport"]}
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
          fields={["filterExcludeAnsweringMachine", "filterMinDuration", "filterMinReplicas"]}
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
  );
}
