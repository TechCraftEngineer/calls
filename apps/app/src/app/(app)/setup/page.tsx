"use client";

import { paths } from "@calls/config";
import { toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Bot, Building2, Download, Globe, Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SetupFinishCard } from "@/components/features/setup/setup-finish-card";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useSession } from "@/lib/better-auth";
import { setOnboardedCookie } from "@/lib/cookies";
import { useORPC } from "@/orpc/react";
import { ApiModal } from "./_components/api-modal";
import { CompanyModal } from "./_components/company-modal";
import { ImportModal } from "./_components/import-modal";
import { ProviderModal } from "./_components/provider-modal";
import { SetupStepsList } from "./_components/setup-steps-list";
import type { SetupStep, StepId } from "./_components/types";
import { useSetupProgress } from "./_hooks";

const SETUP_STEPS: SetupStep[] = [
  {
    id: "provider",
    title: "Выберите провайдера телефонии",
    description: "Подключите АТС для сбора данных о звонках",
    icon: <Bot className="size-[18px]" />,
    timeEstimate: "1 минута",
    actionLabel: "Выбрать",
    editLabel: "Изменить",
  },
  {
    id: "api",
    title: "Подключите API телефонии",
    description: "Настройте интеграцию и импортируйте сотрудников и номера",
    icon: <Globe className="size-[18px]" />,
    timeEstimate: "5 минут",
    actionLabel: "Подключить",
    editLabel: "Изменить",
    href: paths.setup.pbxSetup,
  },
  {
    id: "directory",
    title: "Проверьте сотрудников и номера",
    description: "Синхронизируйте справочник и отметьте номера для исключения",
    icon: <Users className="size-[18px]" />,
    timeEstimate: "5 минут",
    actionLabel: "Проверить",
    editLabel: "Изменить",
    href: paths.setup.directory,
  },
  {
    id: "import",
    title: "Импортируйте историю звонков",
    description: "Загрузите звонки за выбранный период для анализа",
    icon: <Download className="size-[18px]" />,
    timeEstimate: "3 минуты",
    actionLabel: "Импортировать",
    editLabel: "Изменить",
  },
  {
    id: "company",
    title: "Укажите данные компании",
    description: "Название на русском и английском, описание",
    icon: <Building2 className="size-[18px]" />,
    timeEstimate: "2 минуты",
    actionLabel: "Заполнить",
    editLabel: "Изменить",
  },
  {
    id: "evaluation",
    title: "Настройте оценку звонков",
    description: "Выберите шаблон оценки по умолчанию и проверьте доступные шаблоны",
    icon: <BarChart3 className="size-[18px]" />,
    timeEstimate: "2 минуты",
    actionLabel: "Настроить",
    editLabel: "Изменить",
    href: "/settings/evaluation",
  },
];

export default function SetupPage() {
  const router = useRouter();
  const { isPending: sessionPending } = useSession();
  const { activeWorkspace, loading: workspaceLoading } = useWorkspace();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [activeModal, setActiveModal] = useState<StepId | null>(null);

  const { completedSteps, saveCompletedSteps } = useSetupProgress();

  const completeOnboardingMutation = useMutation(
    orpc.workspaces.completeOnboarding.mutationOptions({
      onSuccess: async () => {
        setOnboardedCookie(true);
        toast.success("Настройка завершена!");
        await queryClient.invalidateQueries({ queryKey: orpc.workspaces.list.queryKey({}) });
        router.push(paths.root);
      },
      onError: (error) => {
        console.error("Failed to complete onboarding:", error);
        toast.error("Не удалось завершить настройку");
      },
    }),
  );

  const loading = sessionPending || workspaceLoading;

  useEffect(() => {
    if (!loading && activeWorkspace?.isOnboarded) {
      router.replace(paths.root);
    }
  }, [loading, activeWorkspace?.isOnboarded, router]);

  const completedCount = completedSteps.size;
  const totalSteps = SETUP_STEPS.length;
  const progressPercent = useMemo(() => (completedCount / totalSteps) * 100, [completedCount]);

  const handleCompleteStep = useCallback(
    (stepId: StepId) => {
      const newCompleted = new Set(completedSteps);
      newCompleted.add(stepId);
      saveCompletedSteps(newCompleted);
      setActiveModal(null);
      toast.success("Шаг завершён");
    },
    [completedSteps, saveCompletedSteps],
  );

  const handleFinishSetup = useCallback(() => {
    if (!activeWorkspace) return;
    completeOnboardingMutation.mutate({
      workspaceId: activeWorkspace.id,
    });
  }, [activeWorkspace, completeOnboardingMutation]);

  if (loading) {
    return (
      <main className="main-content flex items-center justify-center">
        <div
          className="flex items-center gap-2 text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          <span>Загрузка...</span>
        </div>
      </main>
    );
  }

  if (!activeWorkspace) {
    return (
      <main className="main-content flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Нет доступа</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            У вас нет активной компании. Сначала создайте компанию.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(paths.onboarding.createWorkspace)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Создать компанию
            </button>
            <p className="text-xs text-muted-foreground">
              Нужна помощь?{" "}
              <a href="/docs" className="underline hover:text-foreground">
                Документация
              </a>{" "}
              или{" "}
              <a href="/support" className="underline hover:text-foreground">
                поддержка
              </a>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Добро пожаловать</h1>
          <p className="text-muted-foreground">
            Выполните эти шаги, чтобы начать работу с системой
          </p>
        </div>

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          Выполнено {completedCount} из {totalSteps} шагов
        </div>

        <SetupStepsList
          steps={SETUP_STEPS}
          completedSteps={completedSteps}
          completedCount={completedCount}
          totalSteps={totalSteps}
          progressPercent={progressPercent}
          onCompleteStep={handleCompleteStep}
          onOpenModal={setActiveModal}
        />

        {completedCount === totalSteps && (
          <SetupFinishCard
            onFinish={handleFinishSetup}
            isLoading={completeOnboardingMutation.isPending}
          />
        )}

        <ProviderModal
          open={activeModal === "provider"}
          onOpenChange={() => setActiveModal(null)}
          onComplete={() => handleCompleteStep("provider")}
        />
        <ApiModal
          open={activeModal === "api"}
          onOpenChange={() => setActiveModal(null)}
          onComplete={() => handleCompleteStep("api")}
        />
        <ImportModal
          open={activeModal === "import"}
          onOpenChange={() => setActiveModal(null)}
          onComplete={() => handleCompleteStep("import")}
        />
        <CompanyModal
          open={activeModal === "company"}
          onOpenChange={() => setActiveModal(null)}
          onComplete={() => handleCompleteStep("company")}
        />
      </div>
    </main>
  );
}
