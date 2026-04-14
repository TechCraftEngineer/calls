"use client";

import { paths } from "@calls/config";
import { Button, Card, toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  Building2,
  Check,
  Download,
  Globe,
  Loader2,
  SkipForward,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import Header from "@/components/layout/header";
import { useSession } from "@/lib/better-auth";
import { setOnboardedCookie } from "@/lib/cookies";
import { useORPC } from "@/orpc/react";
import { ApiModal, CompanyModal, ImportModal, ProviderModal } from "./_components";
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
    title: "Подключите API телефонии",
    description: "Настройте интеграцию и импортируйте сотрудников и номера",
    icon: <Globe className="size-[18px]" />,
    timeEstimate: "5 минут",
    actionLabel: "Подключить",
    skipLabel: "Позже",
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
    skipLabel: "Позже",
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
    skipLabel: "Пропустить",
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

  // Track completed steps in local state
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());

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

  const saveCompletedSteps = useCallback((steps: Set<StepId>) => {
    setCompletedSteps(steps);
    sessionStorage.setItem("setup_completed_steps", JSON.stringify([...steps]));
  }, []);

  // Check if API step is completed by checking if integrations are configured
  const { data: integrations } = useQuery({
    ...orpc.settings.getIntegrations.queryOptions(),
    enabled: !loading && !!activeWorkspace,
  });

  // Load completed steps from sessionStorage on mount (client-only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = sessionStorage.getItem("setup_completed_steps");
      if (saved) {
        const parsed = JSON.parse(saved) as StepId[];
        setCompletedSteps(new Set(parsed));
      }
    } catch {
      // Ignore corrupt JSON
    }
  }, []);

  // Auto-mark API step as completed if integrations are configured
  useEffect(() => {
    if (!integrations) return;

    const hasPbxConfigured = integrations.megapbx?.enabled === true;

    if (hasPbxConfigured && !completedSteps.has("api")) {
      const newCompleted = new Set(completedSteps);
      newCompleted.add("api");
      saveCompletedSteps(newCompleted);
    }
  }, [integrations, completedSteps, saveCompletedSteps]);

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
    toast.success("Шаг завершён");
  };

  const handleSkipStep = (stepId: StepId) => {
    handleCompleteStep(stepId);
  };

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
        <div className="mx-auto max-w-3xl">
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
                      <div className="mr-3 flex shrink-0 items-center justify-center rounded-lg bg-linear-to-b from-amber-100 to-amber-200 p-px shadow-sm">
                        <div className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-linear-to-b from-amber-50 to-amber-100 shadow-sm">
                          <div className="text-amber-600">{step.icon}</div>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="font-medium text-foreground">{step.title}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground/75">
                          {step.timeEstimate}
                        </p>
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
                            onClick={() =>
                              step.href ? router.push(step.href) : setActiveModal(step.id)
                            }
                          >
                            {step.editLabel}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900/75 min-h-[44px] min-w-[44px]"
                            onClick={() =>
                              step.href ? router.push(step.href) : setActiveModal(step.id)
                            }
                            disabled={isDisabled}
                          >
                            {step.actionLabel}
                          </Button>
                          {step.skipLabel && (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={step.skipLabel}
                              className="size-11 rounded-full"
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
              <Button
                size="lg"
                onClick={handleFinishSetup}
                disabled={completeOnboardingMutation.isPending}
                className="px-8"
              >
                {completeOnboardingMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Завершить настройку и перейти к дашборду
              </Button>
            </div>
          )}

          {/* Modals for each step */}
          <ProviderModal
            open={activeModal === "provider"}
            onOpenChange={() => setActiveModal(null)}
            onComplete={(_providerId?: unknown) => handleCompleteStep("provider")}
          />
          <ApiModal
            open={activeModal === "api"}
            onOpenChange={() => setActiveModal(null)}
            onComplete={(_data?: unknown) => handleCompleteStep("api")}
          />
          <ImportModal
            open={activeModal === "import"}
            onOpenChange={() => setActiveModal(null)}
            onComplete={(_data?: unknown) => handleCompleteStep("import")}
          />
          <CompanyModal
            open={activeModal === "company"}
            onOpenChange={() => setActiveModal(null)}
            onComplete={(_data?: unknown) => handleCompleteStep("company")}
          />
        </div>
      </main>
    </>
  );
}
