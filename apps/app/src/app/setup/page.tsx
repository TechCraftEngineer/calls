"use client";

import {
  Button,
  Card,
  CardContent,
  DataGrid,
  DataGridContainer,
  DataGridPagination,
  DataGridTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Input,
  PasswordInput,
  Textarea,
  toast,
  useReactTable,
} from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Building2, Calendar, Check, Globe, Loader2, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getEmployeeColumns } from "@/components/features/settings/megapbx/employee-columns";
import { getNumberColumns } from "@/components/features/settings/megapbx/number-columns";
import type { PbxEmployeeItem, PbxNumberItem } from "@/components/features/settings/types";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { SearchInput } from "@/components/ui/search-input";
import { setOnboardedCookie } from "@/lib/cookies";
import { paths } from "@/lib/paths";
import { useORPC } from "@/orpc/react";

type StepId = "provider" | "api" | "directory" | "company" | "prompts";

interface SetupStep {
  id: StepId;
  title: string;
  description: string;
  icon: React.ReactNode;
  timeEstimate: string;
  actionLabel: string;
  skipLabel?: string;
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: "provider",
    title: "Выберите провайдера телефонии",
    description: "Подключите АТС для сбора данных о звонках",
    icon: <Bot className="size-[18px]" />,
    timeEstimate: "1 минута",
    actionLabel: "Выбрать",
    skipLabel: "Пропустить",
  },
  {
    id: "api",
    title: "Подключите API Мегафон",
    description: "Настройте интеграцию с MegaPBX для загрузки звонков",
    icon: <Globe className="size-[18px]" />,
    timeEstimate: "3 минуты",
    actionLabel: "Подключить",
    skipLabel: "Позже",
  },
  {
    id: "directory",
    title: "Проверьте сотрудников и номера",
    description: "Синхронизируйте справочник и отметьте номера для исключения",
    icon: <Users className="size-[18px]" />,
    timeEstimate: "5 минут",
    actionLabel: "Проверить",
    skipLabel: "Позже",
  },
  {
    id: "company",
    title: "Укажите данные компании",
    description: "Название на русском и английском, описание",
    icon: <Building2 className="size-[18px]" />,
    timeEstimate: "2 минуты",
    actionLabel: "Заполнить",
  },
  {
    id: "prompts",
    title: "Просмотрите системные промпты",
    description: "Ознакомьтесь с настройками анализа звонков",
    icon: <Calendar className="size-[18px]" />,
    timeEstimate: "1 минута",
    actionLabel: "Просмотреть",
  },
];

export default function SetupPage() {
  const { activeWorkspace } = useWorkspace();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<StepId | null>(null);

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

  const handleFinishSetup = async () => {
    if (!activeWorkspace) return;
    try {
      await orpc.workspaces.completeOnboarding.mutate({
        workspaceId: activeWorkspace.id,
      });
      setOnboardedCookie(true);
      toast.success("Настройка завершена!");
      await queryClient.invalidateQueries({ queryKey: orpc.workspaces.list.queryKey() });
      router.push(paths.root);
    } catch (_err) {
      toast.error("Не удалось завершить настройку");
    }
  };

  return (
    <>
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
                    <div className="flex size-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                      <Check className="size-4 text-green-600 dark:text-green-400" />
                    </div>
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
                        <button
                          title={step.skipLabel}
                          className="flex size-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-green-100 hover:text-green-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-green-900/50 dark:hover:text-green-400"
                          onClick={() => handleSkipStep(step.id)}
                          disabled={isDisabled}
                        >
                          <Check className="size-4" />
                        </button>
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
      {completedCount >= 3 && (
        <div className="flex justify-center">
          <Button size="lg" onClick={handleFinishSetup} className="px-8">
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
    </>
  );
}

// --- Modals ---

function ProviderModal({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: () => void;
  onComplete: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const providers = [
    { id: "megafon", name: "Мегафон", available: true },
    { id: "mango", name: "Mango Office", available: false },
    { id: "mts", name: "МТС Exolve", available: false },
    { id: "beeline", name: "Билайн", available: false },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Выберите провайдера</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-4">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => p.available && setSelected(p.id)}
              disabled={!p.available}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selected === p.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              } ${!p.available ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="font-medium">{p.name}</div>
              {!p.available && <div className="text-xs text-muted-foreground">Скоро</div>}
            </button>
          ))}
        </div>
        <Button onClick={onComplete} disabled={!selected} className="w-full">
          Продолжить
        </Button>
      </DialogContent>
    </Dialog>
  );
}

const apiSchema = z.object({
  baseUrl: z.string().url("Введите корректный URL"),
  apiKey: z.string().min(1, "API Key обязателен"),
});

function ApiModal({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: () => void;
  onComplete: () => void;
}) {
  const orpc = useORPC();
  const [testing, setTesting] = useState(false);

  const form = useForm({
    resolver: zodResolver(apiSchema),
    defaultValues: { baseUrl: "", apiKey: "" },
  });

  const handleTestAndSave = async () => {
    const values = form.getValues();
    setTesting(true);
    try {
      const result = await orpc.settings.testPbx.mutate({
        baseUrl: values.baseUrl.trim(),
        apiKey: values.apiKey.trim(),
      });
      const ok = result && typeof result === "object" && "success" in result && result.success;
      if (ok) {
        await orpc.settings.updatePbxAccess.mutate({
          enabled: true,
          baseUrl: values.baseUrl.trim(),
          apiKey: values.apiKey.trim(),
        });
        onComplete();
      } else {
        toast.error("Проверка не пройдена");
      }
    } catch (_err) {
      toast.error("Ошибка подключения");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Подключение к API Мегафон</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Base URL</label>
            <Input {...form.register("baseUrl")} placeholder="https://...megapbx.ru/crmapi/v1" />
            {form.formState.errors.baseUrl && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.baseUrl.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">API Key</label>
            <PasswordInput {...form.register("apiKey")} placeholder="Ключ авторизации" />
          </div>
        </div>
        <Button
          onClick={handleTestAndSave}
          disabled={testing || !form.formState.isValid}
          className="w-full"
        >
          {testing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Проверить и сохранить
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function DirectoryModal({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: () => void;
  onComplete: () => void;
}) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [excludedNumbers, setExcludedNumbers] = useState<Set<string>>(new Set());
  const [employeeSearch, setEmployeeSearch] = useState("");

  const { data: employees = [], isLoading: empLoading } = useQuery({
    ...orpc.settings.listPbxEmployees.queryOptions(),
    enabled: open,
  });
  const { data: numbers = [], isLoading: numLoading } = useQuery({
    ...orpc.settings.listPbxNumbers.queryOptions(),
    enabled: open,
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await orpc.settings.syncPbxDirectory.mutate();
      toast.success("Синхронизировано");
      await queryClient.invalidateQueries({ queryKey: orpc.settings.listPbxEmployees.queryKey() });
      await queryClient.invalidateQueries({ queryKey: orpc.settings.listPbxNumbers.queryKey() });
    } catch (_err) {
      toast.error("Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter((e: PbxEmployeeItem) =>
      [e.displayName, e.email, e.extension].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [employees, employeeSearch]);

  const employeeColumns = useMemo(() => getEmployeeColumns(), []);
  const employeeTable = useReactTable({
    data: filteredEmployees,
    columns: employeeColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 5 } },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Сотрудники и номера</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Синхронизировать
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="font-medium">Сотрудники ({filteredEmployees.length})</h4>
            <SearchInput
              value={employeeSearch}
              onChange={setEmployeeSearch}
              placeholder="Поиск..."
              className="w-48"
            />
          </div>

          <DataGrid
            table={employeeTable}
            recordCount={filteredEmployees.length}
            isLoading={empLoading}
            emptyMessage="Нет данных. Синхронизируйте справочник."
            tableLayout={{ rowBorder: false, headerBorder: false, headerBackground: true }}
          >
            <DataGridContainer className="border rounded-lg">
              <div className="overflow-x-auto max-h-48">
                <DataGridTable<PbxEmployeeItem> />
              </div>
            </DataGridContainer>
          </DataGrid>
        </div>
        <Button onClick={onComplete} className="w-full">
          Утвердить справочник
        </Button>
      </DialogContent>
    </Dialog>
  );
}

const companySchema = z.object({
  name: z.string().min(1, "Обязательно").max(100),
  nameEn: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});

function CompanyModal({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: () => void;
  onComplete: () => void;
}) {
  const { activeWorkspace } = useWorkspace();
  const orpc = useORPC();
  const mutation = useMutation(orpc.workspaces.update.mutationOptions());

  const form = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: { name: activeWorkspace?.name || "", nameEn: "", description: "" },
  });

  const handleSubmit = async (data: z.infer<typeof companySchema>) => {
    if (!activeWorkspace) return;
    try {
      await mutation.mutateAsync({
        workspaceId: activeWorkspace.id,
        name: data.name,
        nameEn: data.nameEn || null,
        description: data.description || null,
      });
      onComplete();
    } catch (_err) {
      toast.error("Ошибка сохранения");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Данные компании</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Название (русский) *</label>
            <Input {...form.register("name")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Название (английский)</label>
            <Input {...form.register("nameEn")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Описание</label>
            <Textarea {...form.register("description")} rows={3} />
          </div>
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PromptsModal({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: () => void;
  onComplete: () => void;
}) {
  const orpc = useORPC();
  const { data: prompts, isLoading } = useQuery({
    ...orpc.settings.getPrompts.queryOptions(),
    enabled: open,
  });

  const valuePrompt = prompts?.find((p) => p.slug === "value-extraction");
  const scriptPrompt = prompts?.find((p) => p.slug === "script-evaluation");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Системные промпты</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <h4 className="mb-2 font-medium">Ценность</h4>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Используется для извлечения ценности из разговора
                  </p>
                  {valuePrompt && (
                    <pre className="max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                      {valuePrompt.prompt}
                    </pre>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h4 className="mb-2 font-medium">Оценка скрипта</h4>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Используется для оценки качества работы менеджера
                  </p>
                  {scriptPrompt && (
                    <pre className="max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                      {scriptPrompt.prompt}
                    </pre>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
        <Button onClick={onComplete} className="w-full">
          Продолжить
        </Button>
      </DialogContent>
    </Dialog>
  );
}
