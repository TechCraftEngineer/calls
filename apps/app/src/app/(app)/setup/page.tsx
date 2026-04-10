"use client";

import { paths } from "@calls/config";
import { Button, Card, toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Building2, Calendar, Check, Globe, Loader2, SkipForward, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import Header from "@/components/layout/header";
import { setOnboardedCookie } from "@/lib/cookies";
import { useSession } from "@/lib/better-auth";
import { useORPC } from "@/orpc/react";
import {
  ApiModal,
  CompanyModal,
  DirectoryModal,
  PromptsModal,
  ProviderModal,
} from "./_components";
import type { SetupStep, StepId } from "./_components/types";

const SETUP_STEPS: SetupStep[] = [
  {
    id: "provider",
    title: "Выберите провайдера телефонии",
    description: "Подключите АТС для сбора данных о звонках",
    icon: <Bot className="size-[18px]" />,
    timeEstimate: "1 минута",
    actionLabel: "Выбрать",
    skipLabel: "Пропустить",
    editLabel: "Изменить",
  },
  {
    id: "api",
    title: "Подключите API Мегафон",
    description: "Настройте интеграцию с MegaPBX для загрузки звонков",
    icon: <Globe className="size-[18px]" />,
    timeEstimate: "3 минуты",
    actionLabel: "Подключить",
    skipLabel: "Позже",
    editLabel: "Изменить",
  },
  {
    id: "directory",
    title: "Проверьте сотрудников и номера",
    description: "Синхронизируйте справочник и отметьте номера для исключения",
    icon: <Users className="size-[18px]" />,
    timeEstimate: "5 минут",
    actionLabel: "Проверить",
    skipLabel: "Позже",
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
    id: "prompts",
    title: "Просмотрите системные промпты",
    description: "Ознакомьтесь с настройками анализа звонков",
    icon: <Calendar className="size-[18px]" />,
    timeEstimate: "1 минута",
    actionLabel: "Просмотреть",
    editLabel: "Изменить",
  },
];

export default function SetupPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const { activeWorkspace, loading: workspaceLoading } = useWorkspace();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [activeModal, setActiveModal] = useState<StepId | null>(null);

  const user = session?.user ?? null;
  const loading = sessionPending || workspaceLoading;

  // Redirect if already onboarded
  if (!loading && activeWorkspace?.isOnboarded) {
    router.replace(paths.root);
    return null;
  }

  // Track completed steps in local state
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = sessionStorage.getItem("setup_completed_steps");
    return new Set(saved ? (JSON.parse(saved) as StepId[]) : []);
  });

  const saveCompletedSteps = (steps: Set<StepId>) => {
    setCompletedSteps(steps);
    sessionStorage.setItem("setup_completed_steps", JSON.stringify([...steps]));
  };

  const completedCount = completedSteps.size;
  const totalSteps = SETUP_STEPS.length;
  const progressPercent = (completedCount / totalSteps) * 100;

  const handleCompleteStep = (stepId: StepId) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    saveCompletedSteps(newCompleted);
    setActiveModal(null);
    toast.success("Шаг завершён");
  };

  const handleSkipStep = (stepId: StepId) => {
    handleCompleteStep(stepId);
  };

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

  const handleFinishSetup = async () => {
    if (!activeWorkspace) return;
    completeOnboardingMutation.mutate({
      workspaceId: activeWorkspace.id,
    });
  };

  if (loading) {
    return (
      <>
        <Header user={user} />
        <main className="main-content flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground" role="status">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            <span>Загрузка...</span>
          </div>
        </main>
      </>
    );
  }

  if (!activeWorkspace) {
    return (
      <>
        <Header user={user} />
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
      </>
    );
  }

  return (
    <>
      <Header user={user} />

      <main className="main-content">
        <div className="max-w-3xl">
          {/* Main Card */}
      <Card className="mb-6 overflow-hidden border bg-card shadow-sm">
        {/* Header with progress */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Завершите настройку</h2>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground sm:block">
                {completedCount} из {totalSteps} завершено
              </span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        {SETUP_STEPS.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          const isPrevCompleted = index === 0 || completedSteps.has(SETUP_STEPS[index - 1].id);
          const isDisabled = !isPrevCompleted && !isCompleted;

          return (
            <div
              key={step.id}
              className={`border-b border-border last:border-0 ${isDisabled ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex max-w-lg min-w-0 flex-1 items-center">
                  {/* Icon */}
                  <div className="mr-3 flex flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-amber-100 to-amber-200 p-px shadow-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-gradient-to-b from-amber-50 to-amber-100 shadow-sm">
                      <div className="text-amber-600">{step.icon}</div>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-medium text-foreground">{step.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground/75">{step.timeEstimate}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <>
                      <div className="flex size-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                        <Check className="size-4 text-green-600 dark:text-green-400" />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setActiveModal(step.id)}
                      >
                        {step.editLabel}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900/75"
                        onClick={() => setActiveModal(step.id)}
                        disabled={isDisabled}
                      >
                        {step.actionLabel}
                      </Button>
                      {step.skipLabel && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title={step.skipLabel}
                          className="size-6 rounded-full"
                          onClick={() => handleSkipStep(step.id)}
                          disabled={isDisabled}
                        >
                          <SkipForward className="size-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Finish Button */}
      {completedCount === totalSteps && (
        <div className="flex justify-center">
          <Button size="lg" onClick={handleFinishSetup} disabled={completeOnboardingMutation.isPending} className="px-8">
            {completeOnboardingMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Завершить настройку и перейти к дашборду
          </Button>
        </div>
      )}

      {/* Modals for each step */}
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
      <DirectoryModal
        open={activeModal === "directory"}
        onOpenChange={() => setActiveModal(null)}
        onComplete={() => handleCompleteStep("directory")}
      />
      <CompanyModal
        open={activeModal === "company"}
        onOpenChange={() => setActiveModal(null)}
        onComplete={() => handleCompleteStep("company")}
      />
      <PromptsModal
        open={activeModal === "prompts"}
        onOpenChange={() => setActiveModal(null)}
        onComplete={() => handleCompleteStep("prompts")}
      />
        </div>
      </main>
    </>
  );
}
