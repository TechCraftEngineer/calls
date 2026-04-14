"use client";

import { paths } from "@calls/config";
import { Badge, Button, Card, Progress, toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  Building2,
  Check,
  ChevronRight,
  Download,
  Globe,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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

  const updateSetupProgressMutation = useMutation(
    orpc.workspaces.updateSetupProgress.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.workspaces.list.queryKey(),
        });
      },
    }),
  );

  const user = session?.user ?? null;
  const loading = sessionPending || workspaceLoading;

  const updateSetupProgressMutationRef = useRef(updateSetupProgressMutation);

  useEffect(() => {
    updateSetupProgressMutationRef.current = updateSetupProgressMutation;
  }, [updateSetupProgressMutation]);

  const saveCompletedSteps = useCallback(
    (steps: Set<StepId>) => {
      setCompletedSteps(steps);
      if (activeWorkspace) {
        // Сохраняем в базу данных
        updateSetupProgressMutationRef.current.mutate({
          workspaceId: activeWorkspace.id,
          completedSteps: [...steps],
        });
      }
    },
    [activeWorkspace],
  );

  // Check if API step is completed by checking if integrations are configured
  const { data: integrations } = useQuery({
    ...orpc.settings.getIntegrations.queryOptions(),
    enabled: !loading && !!activeWorkspace,
  });

  // Load completed steps from database on mount
  const { data: setupProgressData } = useQuery({
    ...orpc.workspaces.getSetupProgress.queryOptions({
      input: {
        workspaceId: activeWorkspace?.id ?? "",
      },
    }),
    enabled: !loading && !!activeWorkspace,
  });

  useEffect(() => {
    if (setupProgressData?.completedSteps && Array.isArray(setupProgressData.completedSteps)) {
      // Валидация что все элементы являются строками
      const validSteps = setupProgressData.completedSteps.filter(
        (step): step is StepId => typeof step === "string" && step.length > 0,
      );
      setCompletedSteps(new Set(validSteps));
    } else if (activeWorkspace) {
      // Reset if switching workspace
      setCompletedSteps(new Set());
    }
  }, [setupProgressData, activeWorkspace]);

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

  // Evaluation step must be manually marked as completed by the user
  // (removed auto-completion logic)

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
      // Если у следующего шага есть href, переходим на страницу
      if (nextStep.href) {
        router.push(nextStep.href);
      } else {
        // Иначе открываем модальное окно следующего шага
        setActiveModal(nextStep.id);
      }
    } else {
      toast.success("Шаг завершён");
    }
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
        <div className="mx-auto max-w-4xl space-y-8 py-8">
          {/* Hero Section */}
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-sm">
              <Sparkles className="size-4 text-primary" />
              <span className="font-medium">Начало работы</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Настройте вашу систему
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Пройдите несколько простых шагов для полной настройки системы анализа звонков
            </p>
          </div>

          {/* Progress Card */}
          <Card className="border-2">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Прогресс</h3>
                  <p className="mt-1 text-2xl font-bold">
                    {completedCount} из {totalSteps}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {Math.round(progressPercent)}%
                  </div>
                  <p className="text-xs text-muted-foreground">завершено</p>
                </div>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>
          </Card>

          {/* Steps List */}
          <div className="space-y-3">
            {SETUP_STEPS.map((step, index) => {
              const isCompleted = completedSteps.has(step.id);
              const isPrevCompleted = index === 0 || completedSteps.has(SETUP_STEPS[index - 1].id);
              const isDisabled = !isPrevCompleted && !isCompleted;
              const isCurrent = !isCompleted && isPrevCompleted;

              return (
                <Card
                  key={step.id}
                  className={`group relative overflow-hidden transition-all ${
                    isCompleted
                      ? "border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20"
                      : isCurrent
                        ? "border-primary/50 shadow-md ring-2 ring-primary/10"
                        : isDisabled
                          ? "opacity-50"
                          : "hover:shadow-md"
                  }`}
                >
                  {/* Step Number Badge */}
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary/50 to-primary" />

                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Icon & Number */}
                      <div className="flex shrink-0 items-center gap-3">
                        <Badge
                          variant={isCompleted ? "default" : isCurrent ? "default" : "secondary"}
                          className="size-6 rounded-full p-0 flex items-center justify-center text-xs"
                        >
                          {index + 1}
                        </Badge>
                        <div
                          className={`flex size-10 items-center justify-center rounded-lg transition-all ${
                            isCompleted
                              ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                              : isCurrent
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isCompleted ? <Check className="size-5" strokeWidth={2.5} /> : step.icon}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{step.title}</h3>
                          {isCompleted && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 text-xs"
                            >
                              Выполнено
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        {isCompleted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              step.href ? router.push(step.href) : setActiveModal(step.id)
                            }
                            className="group/btn"
                          >
                            {step.editLabel}
                            <ChevronRight className="ml-1 size-4 transition-transform group-hover/btn:translate-x-0.5" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                step.href ? router.push(step.href) : setActiveModal(step.id)
                              }
                              disabled={isDisabled}
                              className="group/btn"
                            >
                              {step.actionLabel}
                              <ChevronRight className="ml-1 size-4 transition-transform group-hover/btn:translate-x-0.5" />
                            </Button>
                            {step.skipLabel && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSkipStep(step.id)}
                                disabled={isDisabled}
                              >
                                {step.skipLabel}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Finish Button */}
          {completedCount === totalSteps && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="size-8 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Отличная работа!</h3>
                <p className="mb-6 text-muted-foreground">
                  Все шаги завершены. Теперь вы можете начать работу с системой.
                </p>
                <Button
                  size="lg"
                  onClick={handleFinishSetup}
                  disabled={completeOnboardingMutation.isPending}
                  className="px-8"
                >
                  {completeOnboardingMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 size-4" />
                  )}
                  Завершить настройку и перейти к дашборду
                </Button>
              </div>
            </Card>
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
