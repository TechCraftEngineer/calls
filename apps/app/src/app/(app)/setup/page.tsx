"use client";

import { paths } from "@calls/config";
import { toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Bot, Building2, Download, Globe, Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useSession } from "@/lib/better-auth";
import { setOnboardedCookie } from "@/lib/cookies";
import { useORPC } from "@/orpc/react";
import {
  ApiModal,
  CompanyModal,
  ImportModal,
  ProviderModal,
  SetupFinishCard,
  SetupStepsList,
} from "./_components";
import type { SetupStep, StepId } from "./_components/types";
import { useAutoCompleteSteps, useSetupProgress } from "./_hooks";

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
  const { data: session, isPending: sessionPending } = useSession();
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
        await queryClient.invalidateQueries({ queryKey: orpc.workspaces.list.queryKey() });
        router.push(paths.root);
      },
      onError: () => {
        toast.error("Не удалось завершить настройку");
      },
    }),
  );

  const user = session?.user ?? null;
  const loading = sessionPending || workspaceLoading;

  // Auto-complete steps based on integrations
  useAutoCompleteSteps(completedSteps, saveCompletedSteps);

  // Auto-open next modal when returning from href-based steps
  // useAutoOpenModal(SETUP_STEPS, completedSteps, activeModal, setActiveModal);

  // Redirect if already onboarded
  useEffect(() => {
    if (!loading && activeWorkspace?.isOnboarded) {
      router.replace(paths.root);
    }
  }, [loading, activeWorkspace?.isOnboarded, router]);

  const completedCount = completedSteps.size;
  const totalSteps = SETUP_STEPS.length;
  const progressPercent = (completedCount / totalSteps) * 100;

  const handleCompleteStep = (stepId: StepId) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    saveCompletedSteps(newCompleted);
    setActiveModal(null);

    // Автоматический переход к следующему шагу
    const currentIndex = SETUP_STEPS.findIndex((s) => s.id === stepId);
    const nextStep = SETUP_STEPS[currentIndex + 1];

    if (nextStep) {
      if (nextStep.href) {
        router.push(nextStep.href);
      } else {
        setActiveModal(nextStep.id);
      }
    } else {
      toast.success("Шаг завершён");
    }
  };

  const handleFinishSetup = async () => {
    if (!activeWorkspace) return;
    completeOnboardingMutation.mutate({
      workspaceId: activeWorkspace.id,
    });
  };

  if (loading) {
    return (
      <main className="main-content flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground" role="status">
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
        {/* Page title */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Добро пожаловать</h1>
          <p className="text-muted-foreground">
            Выполните эти шаги, чтобы начать работу с системой
          </p>
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

        {/* Modals */}
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
