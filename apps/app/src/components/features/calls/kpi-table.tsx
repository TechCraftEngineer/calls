"use client";

import {
  Badge,
  Button,
  Calendar,
  Card,
  CardContent,
  DataGrid,
  DataGridColumnHeader,
  DataGridColumnVisibility,
  DataGridContainer,
  DataGridPagination,
  DataGridTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  toast,
} from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  Phone,
  Settings2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { KpiTableSkeleton } from "@/app/statistics/statistics-skeletons";
import { useORPC } from "@/orpc/react";

interface KpiRow {
  employeeExternalId: string;
  name: string;
  email: string;
  baseSalary: number;
  targetBonus: number;
  targetTalkTimeMinutes: number;
  periodTargetTalkTimeMinutes: number;
  actualTalkTimeMinutes: number;
  kpiCompletionPercentage: number;
  calculatedBonus: number;
  totalCalculatedSalary: number;
  totalCalls: number;
  incoming: number;
  outgoing: number;
  missed: number;
}

interface KpiDraft {
  baseSalary: number;
  targetBonus: number;
  targetTalkTimeMinutes: number;
}

interface BulkKpiDraft {
  baseSalary: string;
  targetBonus: string;
  targetTalkTimeMinutes: string;
}

const KPI_FIELD_LIMITS: Record<keyof KpiDraft | keyof BulkKpiDraft, number> = {
  baseSalary: 1_000_000,
  targetBonus: 1_000_000,
  targetTalkTimeMinutes: 100_000,
};

const kpiDraftSchema = z.object({
  baseSalary: z.number().int().min(0).max(1_000_000),
  targetBonus: z.number().int().min(0).max(1_000_000),
  targetTalkTimeMinutes: z.number().int().min(0).max(100_000),
});

const pad2 = (value: number) => value.toString().padStart(2, "0");
const toMonthValue = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
const getCurrentMonthValue = () => toMonthValue(new Date());
const getMonthRange = (monthValue: string) => {
  const [yearRaw, monthRaw] = monthValue.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = fallback.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    return {
      startDate: `${y}-${pad2(m + 1)}-01`,
      endDate: `${y}-${pad2(m + 1)}-${pad2(lastDay)}`,
      normalizedMonthValue: `${y}-${pad2(m + 1)}`,
    };
  }
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startDate: `${year}-${pad2(month)}-01`,
    endDate: `${year}-${pad2(month)}-${pad2(lastDay)}`,
    normalizedMonthValue: `${year}-${pad2(month)}`,
  };
};

const shiftMonth = (monthValue: string, delta: number) => {
  const [yearRaw, monthRaw] = monthValue.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return getCurrentMonthValue();
  }
  const shifted = new Date(year, month - 1 + delta, 1);
  return toMonthValue(shifted);
};

const monthLabel = (monthValue: string) => {
  const [yearRaw, monthRaw] = monthValue.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return "Текущий месяц";
  return new Date(year, month - 1, 1).toLocaleString("ru-RU", {
    month: "long",
    year: "numeric",
  });
};

const KPI_TABLE_STATE_KEY = "kpi-table-state";

// Zod schema для валидации состояния таблицы
const sortingItemSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

const kpiTableStateSchema = z.object({
  month: z.string(),
  sorting: z.array(sortingItemSchema),
  pagination: z.object({
    pageSize: z.number().int().positive(),
    pageIndex: z.number().int().nonnegative(),
  }),
});

type KpiTableState = z.infer<typeof kpiTableStateSchema>;

const saveKpiTableState = (state: KpiTableState): void => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KPI_TABLE_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save KPI table state", error);
  }
};

const loadKpiTableState = (): KpiTableState | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(KPI_TABLE_STATE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const result = kpiTableStateSchema.safeParse(parsed);
    if (!result.success) {
      console.error("Неверное состояние таблицы KPI в sessionStorage:", result.error);
      return null;
    }
    return result.data;
  } catch (error) {
    console.error("Failed to load KPI table state", error);
    return null;
  }
};

export default function KpiTable() {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthValue);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const {
    startDate: dFrom,
    endDate: dTo,
    normalizedMonthValue,
  } = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);
  const currentMonthValue = useMemo(() => getCurrentMonthValue(), []);
  const canGoNextMonth = normalizedMonthValue < currentMonthValue;
  const [draftsByEmployeeId, setDraftsByEmployeeId] = useState<Record<string, KpiDraft>>({});
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkDraft, setBulkDraft] = useState<BulkKpiDraft>({
    baseSalary: "",
    targetBonus: "",
    targetTalkTimeMinutes: "",
  });
  const skipInvalidateOnSuccessRef = useRef(false);
  const tableRef = useRef<ReturnType<typeof useReactTable<KpiRow>> | null>(null);
  const processedEmployeeIdsRef = useRef<Set<string>>(new Set());

  // Функция для сохранения состояния таблицы перед навигацией
  const saveStateBeforeNavigation = useCallback(() => {
    const currentTable = tableRef.current;
    if (currentTable) {
      saveKpiTableState({
        month: normalizedMonthValue,
        sorting: currentTable.getState().sorting,
        pagination: currentTable.getState().pagination,
      });
    }
  }, [normalizedMonthValue]);

  const getDailyViewHref = useCallback(
    (employeeExternalId: string) => {
      const encodedId = encodeURIComponent(employeeExternalId);
      return `/statistics/kpi/daily/${encodedId}?startDate=${dFrom}&endDate=${dTo}`;
    },
    [dFrom, dTo],
  );

  const { data = [], isPending: loading } = useQuery(
    orpc.statistics.getKpi.queryOptions({
      input: { startDate: dFrom, endDate: dTo },
    }),
  );

  const rows = useMemo(() => (Array.isArray(data) ? (data as KpiRow[]) : []), [data]);
  const kpiQueryKey = useMemo(
    () =>
      orpc.statistics.getKpi.queryKey({
        input: { startDate: dFrom, endDate: dTo },
      }),
    [dFrom, dTo, orpc.statistics.getKpi],
  );

  useEffect(() => {
    const monthFromUrl = searchParams.get("month");
    if (!monthFromUrl) {
      // Проверяем сохраненное состояние только если нет параметра в URL
      const savedState = loadKpiTableState();
      if (savedState?.month) {
        setSelectedMonth(savedState.month);
      }
      return;
    }
    const { normalizedMonthValue: normalizedFromUrl } = getMonthRange(monthFromUrl);
    setSelectedMonth((prev) => (prev === normalizedFromUrl ? prev : normalizedFromUrl));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedMonth === currentMonthValue) {
      params.delete("month");
    } else {
      params.set("month", selectedMonth);
    }
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [currentMonthValue, pathname, router, searchParams, selectedMonth]);

  useEffect(() => {
    // Проверяем, есть ли новые сотрудники для инициализации
    const newIds = rows.filter(
      (row) => !processedEmployeeIdsRef.current.has(row.employeeExternalId),
    );
    if (newIds.length === 0) return;

    // Обновляем ref с новыми id
    for (const row of newIds) {
      processedEmployeeIdsRef.current.add(row.employeeExternalId);
    }

    setDraftsByEmployeeId((prev) => {
      const next: Record<string, KpiDraft> = {};
      for (const row of newIds) {
        next[row.employeeExternalId] = {
          baseSalary: row.baseSalary,
          targetBonus: row.targetBonus,
          targetTalkTimeMinutes: row.targetTalkTimeMinutes,
        };
      }
      return { ...prev, ...next };
    });
  }, [rows]);

  const updateKpiMutation = useMutation(
    orpc.statistics.updateKpiEmployee.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: kpiQueryKey });
      },
    }),
  );
  const bulkUpdateKpiMutation = useMutation(
    orpc.statistics.updateKpiEmployee.mutationOptions({
      onSuccess: async () => {
        if (skipInvalidateOnSuccessRef.current) return;
        await queryClient.invalidateQueries({ queryKey: kpiQueryKey });
      },
    }),
  );
  const isApplyingBulkKpi = bulkUpdateKpiMutation.isPending;

  const toNonNegativeInt = (value: number): number => {
    if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
    return Math.max(0, Math.trunc(value));
  };

  const setDraftField = (employeeExternalId: string, field: keyof KpiDraft, value: string) => {
    const parsed = Number(value);
    const safeValue =
      value.trim() === "" || Number.isNaN(parsed)
        ? 0
        : Math.min(toNonNegativeInt(parsed), KPI_FIELD_LIMITS[field]);
    setDraftsByEmployeeId((prev) => ({
      ...prev,
      [employeeExternalId]: {
        ...prev[employeeExternalId],
        [field]: safeValue,
      },
    }));
  };

  const saveRowKpi = async (row: KpiRow) => {
    const draft = draftsByEmployeeId[row.employeeExternalId];
    if (!draft) return;
    const parsedDraft = kpiDraftSchema.safeParse(draft);
    if (!parsedDraft.success) {
      toast.error("Проверьте значения KPI: есть недопустимые поля");
      return;
    }

    setSavingEmployeeId(row.employeeExternalId);
    try {
      await updateKpiMutation.mutateAsync({
        employeeExternalId: row.employeeExternalId,
        data: {
          kpiBaseSalary: parsedDraft.data.baseSalary,
          kpiTargetBonus: parsedDraft.data.targetBonus,
          kpiTargetTalkTimeMinutes: parsedDraft.data.targetTalkTimeMinutes,
        },
      });
      toast.success(`KPI для ${row.name} сохранены`);
      setEditingEmployeeId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить KPI";
      toast.error(message);
      console.error("Failed to update KPI by employee", {
        employeeExternalId: row.employeeExternalId,
        error,
      });
    } finally {
      setSavingEmployeeId(null);
    }
  };

  const applyKpiToAllEmployees = async () => {
    const normalizeBulkDraft = (): KpiDraft | null => {
      const parseBulkField = (value: string, limit: number): number | undefined => {
        if (value.trim() === "") return undefined;
        const parsed = Number(value);
        if (Number.isNaN(parsed)) return undefined;
        return Math.min(toNonNegativeInt(parsed), limit);
      };
      const baseSalary = parseBulkField(bulkDraft.baseSalary, KPI_FIELD_LIMITS.baseSalary);
      const targetBonus = parseBulkField(bulkDraft.targetBonus, KPI_FIELD_LIMITS.targetBonus);
      const targetTalkTimeMinutes = parseBulkField(
        bulkDraft.targetTalkTimeMinutes,
        KPI_FIELD_LIMITS.targetTalkTimeMinutes,
      );
      if (baseSalary == null || targetBonus == null || targetTalkTimeMinutes == null) {
        return null;
      }
      const normalized: KpiDraft = {
        baseSalary,
        targetBonus,
        targetTalkTimeMinutes,
      };
      const parsed = kpiDraftSchema.safeParse(normalized);
      return parsed.success ? parsed.data : null;
    };

    const parsedDraft = normalizeBulkDraft();
    if (!parsedDraft) {
      toast.error("Проверьте значения KPI: есть недопустимые поля");
      return;
    }
    if (rows.length === 0) {
      toast.error("Нет сотрудников для обновления");
      return;
    }

    skipInvalidateOnSuccessRef.current = true;
    try {
      const updates = await Promise.allSettled(
        rows.map((row) =>
          bulkUpdateKpiMutation.mutateAsync({
            employeeExternalId: row.employeeExternalId,
            data: {
              kpiBaseSalary: parsedDraft.baseSalary,
              kpiTargetBonus: parsedDraft.targetBonus,
              kpiTargetTalkTimeMinutes: parsedDraft.targetTalkTimeMinutes,
            },
          }),
        ),
      );
      const successEmployeeIds = rows
        .filter((_, idx) => updates[idx]?.status === "fulfilled")
        .map((row) => row.employeeExternalId);
      if (successEmployeeIds.length > 0) {
        setDraftsByEmployeeId((prev) => {
          const next = { ...prev };
          for (const employeeId of successEmployeeIds) {
            next[employeeId] = {
              baseSalary: parsedDraft.baseSalary,
              targetBonus: parsedDraft.targetBonus,
              targetTalkTimeMinutes: parsedDraft.targetTalkTimeMinutes,
            };
          }
          return next;
        });
      }

      await queryClient.invalidateQueries({ queryKey: kpiQueryKey });
      const failedCount = updates.filter((result) => result.status === "rejected").length;
      if (failedCount > 0) {
        throw new Error(
          failedCount === rows.length
            ? "Не удалось обновить KPI ни одному сотруднику"
            : `KPI обновлён не для всех сотрудников: ошибок ${failedCount}`,
        );
      }

      toast.success("KPI применен всем сотрудникам");
      setIsBulkEditOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось применить KPI всем сотрудникам";
      toast.error(message);
      console.error("Не удалось применить KPI ко всем сотрудникам", { error });
    } finally {
      skipInvalidateOnSuccessRef.current = false;
    }
  };

  const formatRub = useCallback(
    (value: number) =>
      value.toLocaleString("ru-RU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    [],
  );

  const columns = useMemo<ColumnDef<KpiRow>[]>(
    () => [
      {
        id: "employee",
        accessorKey: "name",
        size: 340,
        minSize: 300,
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Сотрудник" className="min-w-52" />
        ),
        cell: ({ row }) => (
          <div className="flex items-start gap-3 py-1">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Phone className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-foreground truncate">{row.original.name}</div>
              <div className="text-sm text-muted-foreground truncate">{row.original.email}</div>
            </div>
          </div>
        ),
        meta: {
          headerTitle: "Сотрудник",
          skeleton: <Skeleton className="h-5 w-30" />,
        },
      },
      {
        id: "baseSalary",
        accessorFn: (row) => row.baseSalary,
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Оклад, ₽"
            className="min-w-28"
            tooltip="Базовый оклад сотрудника в рублях"
          />
        ),
        cell: ({ row }) => (
          <div className="font-medium tabular-nums">
            {formatRub(row.original.baseSalary)}&nbsp;₽
          </div>
        ),
        meta: { headerTitle: "Оклад, ₽" },
      },
      {
        id: "targetBonus",
        accessorFn: (row) => row.targetBonus,
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Бонус, ₽"
            className="min-w-28"
            tooltip="Целевой бонус при выполнении KPI"
          />
        ),
        cell: ({ row }) => (
          <div className="font-medium tabular-nums text-emerald-600">
            {formatRub(row.original.targetBonus)}&nbsp;₽
          </div>
        ),
        meta: { headerTitle: "Бонус, ₽" },
      },
      {
        id: "targetTalkTimeMonthly",
        accessorFn: (row) => row.targetTalkTimeMinutes,
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Цель, мин/мес"
            className="min-w-30"
            tooltip="Целевое время разговоров в минутах за месяц"
          />
        ),
        cell: ({ row }) => (
          <div className="tabular-nums text-muted-foreground">
            {row.original.targetTalkTimeMinutes}
          </div>
        ),
        meta: { headerTitle: "Цель, мин/мес" },
      },
      {
        id: "actualTalkTimeMinutes",
        accessorFn: (row) => row.actualTalkTimeMinutes,
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Факт, мин"
            className="min-w-28"
            tooltip="Фактическое время разговоров за выбранный период"
          />
        ),
        cell: ({ row }) => {
          const isOnTarget =
            row.original.actualTalkTimeMinutes >= row.original.periodTargetTalkTimeMinutes;
          return (
            <div className="flex items-center gap-2">
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                  isOnTarget ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                }`}
              >
                {isOnTarget ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  <TrendingUp className="size-3.5" aria-hidden />
                )}
              </div>
              <span
                className={`font-medium tabular-nums ${
                  isOnTarget ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {row.original.actualTalkTimeMinutes}
              </span>
            </div>
          );
        },
        meta: { headerTitle: "Факт, мин" },
      },
      {
        id: "kpiCompletion",
        accessorFn: (row) => row.kpiCompletionPercentage,
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Выполнение, %"
            className="min-w-36"
            tooltip="Процент выполнения KPI относительно плана периода"
          />
        ),
        cell: ({ row }) => {
          const percentage = row.original.kpiCompletionPercentage;
          const isComplete = percentage >= 100;
          const isGood = percentage >= 80;
          return (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-20">
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isComplete ? "bg-emerald-500" : isGood ? "bg-blue-500" : "bg-amber-500"
                    }`}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage}
                    aria-valuetext={`${percentage}% выполнено`}
                    aria-label={`Выполнение KPI: ${percentage}%`}
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <Badge
                variant={isComplete ? "default" : "secondary"}
                className={`min-w-14 justify-center tabular-nums ${
                  isComplete
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : isGood
                      ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                {percentage}%
              </Badge>
            </div>
          );
        },
        meta: { headerTitle: "Выполнение, %" },
      },
      {
        id: "calculatedBonus",
        accessorFn: (row) => row.calculatedBonus,
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Бонус за период, ₽"
            className="min-w-40"
            tooltip="Рассчитанный бонус за выбранный период"
          />
        ),
        cell: ({ row }) => (
          <div className="font-semibold tabular-nums text-emerald-600">
            +{formatRub(row.original.calculatedBonus)}&nbsp;₽
          </div>
        ),
        meta: { headerTitle: "Бонус за период, ₽" },
      },
      {
        id: "totalCalculatedSalary",
        accessorFn: (row) => row.totalCalculatedSalary,
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Итого, ₽"
            className="min-w-28"
            tooltip="Сумма оклада и бонуса за период"
          />
        ),
        cell: ({ row }) => (
          <div className="font-bold tabular-nums text-blue-600">
            {formatRub(row.original.totalCalculatedSalary)}&nbsp;₽
          </div>
        ),
        meta: { headerTitle: "Итого, ₽" },
      },
      {
        id: "dailyView",
        accessorKey: "employeeExternalId",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="По дням"
            className="min-w-32"
            tooltip="Просмотр детализации KPI по дням"
            visibility={false}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const href = getDailyViewHref(row.original.employeeExternalId);
          return (
            <Link
              href={href}
              onClick={saveStateBeforeNavigation}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 touch-action-manipulation"
              aria-label={`Просмотр KPI по дням для ${row.original.name}`}
            >
              <Eye className="size-4 mr-2" aria-hidden />
              По дням
            </Link>
          );
        },
        meta: { headerTitle: "По дням" },
      },
      {
        id: "kpiSettings",
        accessorKey: "employeeExternalId",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Настройки"
            className="min-w-36"
            tooltip="Редактирование KPI сотрудника"
            visibility={false}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const rowSaving =
            savingEmployeeId === row.original.employeeExternalId && updateKpiMutation.isPending;
          return (
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={rowSaving || isApplyingBulkKpi}
              className="touch-action-manipulation"
              aria-label={`Открыть настройки KPI для ${row.original.name}`}
              onClick={() => setEditingEmployeeId(row.original.employeeExternalId)}
            >
              {rowSaving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Settings2 className="size-4" aria-hidden />
              )}
            </Button>
          );
        },
        meta: { headerTitle: "Настройки" },
      },
    ],
    [
      formatRub,
      isApplyingBulkKpi,
      getDailyViewHref,
      saveStateBeforeNavigation,
      savingEmployeeId,
      updateKpiMutation.isPending,
    ],
  );

  // Восстановление состояния таблицы из sessionStorage
  const initialTableState = useMemo(() => {
    const savedState = loadKpiTableState();
    if (savedState) {
      return {
        sorting: savedState.sorting,
        pagination: savedState.pagination,
        columnPinning: { left: ["employee"] },
      };
    }
    return {
      sorting: [{ id: "employee", desc: false }],
      pagination: { pageSize: 10, pageIndex: 0 },
      columnPinning: { left: ["employee"] },
    };
  }, []);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: initialTableState,
  });

  // Сохраняем ссылку на table для использования при навигации
  tableRef.current = table;

  const exportCurrentMonthCsv = useCallback(() => {
    if (rows.length === 0) {
      toast.error("Нет данных для экспорта");
      return;
    }

    const header = [
      "Сотрудник",
      "Email",
      "Базовый оклад, ₽",
      "Целевой бонус, ₽",
      "Цель по времени разговоров, мин/месяц",
      "План по времени на выбранный период, мин",
      "Фактическое время разговоров, мин",
      "Выполнение KPI, %",
      "Рассчитанный бонус, ₽",
      "Итоговая выплата, ₽",
    ];

    const lines = rows.map((row) => [
      row.name,
      row.email,
      String(row.baseSalary),
      String(row.targetBonus),
      String(row.targetTalkTimeMinutes),
      String(row.periodTargetTalkTimeMinutes),
      String(row.actualTalkTimeMinutes),
      String(row.kpiCompletionPercentage),
      String(row.calculatedBonus),
      String(row.totalCalculatedSalary),
    ]);

    const escapeCsvValue = (value: string) => {
      const normalized = value.replaceAll('"', '""');
      return `"${normalized}"`;
    };

    const csv = [header, ...lines].map((row) => row.map(escapeCsvValue).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kpi-${normalizedMonthValue}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [normalizedMonthValue, rows]);

  const editingRow =
    editingEmployeeId == null
      ? null
      : (rows.find((row) => row.employeeExternalId === editingEmployeeId) ?? null);
  const editingDraft = editingRow
    ? (draftsByEmployeeId[editingRow.employeeExternalId] ?? {
        baseSalary: editingRow.baseSalary,
        targetBonus: editingRow.targetBonus,
        targetTalkTimeMinutes: editingRow.targetTalkTimeMinutes,
      })
    : null;

  if (loading) return <KpiTableSkeleton />;

  return (
    <Card className="card p-0! overflow-hidden mt-6">
      <div className="py-5 px-6 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="section-title m-0 flex items-center gap-2">Расчет KPI сотрудников</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Период: {dFrom} — {dTo}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setIsBulkEditOpen(true)}
            className="touch-action-manipulation"
            disabled={rows.length === 0 || isApplyingBulkKpi}
          >
            {isApplyingBulkKpi && <Loader2 className="size-4 animate-spin mr-2" aria-hidden />}
            Применить KPI всем
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Предыдущий месяц"
            className="touch-action-manipulation"
            onClick={() => setSelectedMonth((prev) => shiftMonth(prev, -1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="min-w-52 justify-start text-left font-normal touch-action-manipulation"
                aria-label="Выбор месяца KPI"
              >
                <CalendarIcon className="size-4 shrink-0 opacity-70 mr-2" aria-hidden />
                <span className="truncate">{monthLabel(normalizedMonthValue)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                captionLayout="dropdown"
                month={new Date(`${normalizedMonthValue}-01T00:00:00`)}
                defaultMonth={new Date(`${normalizedMonthValue}-01T00:00:00`)}
                startMonth={new Date(2020, 0, 1)}
                endMonth={
                  new Date(
                    Number.parseInt(currentMonthValue.split("-")[0] ?? "0", 10),
                    Number.parseInt(currentMonthValue.split("-")[1] ?? "1", 10) - 1,
                    1,
                  )
                }
                onMonthChange={(month) => {
                  setSelectedMonth(toMonthValue(month));
                  setIsMonthPickerOpen(false);
                }}
                disabled={() => true}
                formatters={{
                  formatCaption: (date) => format(date, "LLLL yyyy", { locale: ru }),
                }}
              />
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Следующий месяц"
            className="touch-action-manipulation"
            onClick={() => setSelectedMonth((prev) => shiftMonth(prev, 1))}
            disabled={!canGoNextMonth}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="touch-action-manipulation"
            onClick={() => setSelectedMonth(shiftMonth(currentMonthValue, -1))}
          >
            -1 мес
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="touch-action-manipulation hidden md:inline-flex"
            onClick={() => setSelectedMonth(shiftMonth(currentMonthValue, -3))}
          >
            -3 мес
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="touch-action-manipulation hidden lg:inline-flex"
            onClick={() => setSelectedMonth(shiftMonth(currentMonthValue, -6))}
          >
            -6 мес
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="touch-action-manipulation"
            onClick={() => setSelectedMonth(currentMonthValue)}
            disabled={normalizedMonthValue === currentMonthValue}
          >
            Текущий
          </Button>
        </div>
      </div>
      <CardContent className="p-0!">
        <DataGrid
          table={table}
          recordCount={rows.length}
          isLoading={loading}
          emptyMessage="Нет данных для отображения"
          tableLayout={{
            columnsVisibility: true,
            columnsMovable: true,
            columnsPinnable: true,
            columnsDraggable: false,
            rowBorder: true,
            headerBorder: true,
            headerBackground: true,
            headerSticky: true,
          }}
          tableClassNames={{
            headerSticky: "sticky top-0 z-30 bg-background/95 backdrop-blur-xs",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-2">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm font-normal">
                <span className="text-muted-foreground">Всего:</span>
                <span className="ml-1.5 font-semibold">{rows.length}</span>
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="touch-action-manipulation"
                onClick={exportCurrentMonthCsv}
                aria-label={`Экспортировать данные KPI за ${monthLabel(normalizedMonthValue)} в CSV`}
              >
                <Download className="size-4" aria-hidden />
                <span className="hidden sm:inline">Экспорт CSV</span>
                <span className="sm:hidden">CSV</span>
              </Button>
              <DataGridColumnVisibility
                table={table}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="touch-action-manipulation"
                    aria-label="Настроить видимость колонок"
                  >
                    <Settings2 className="size-4" aria-hidden />
                    <span className="hidden sm:inline">Колонки</span>
                  </Button>
                }
              />
            </div>
          </div>
          <DataGridContainer className="border-0">
            <div className="max-h-[70vh] overflow-auto overscroll-contain">
              <div className="min-w-350">
                <DataGridTable<KpiRow> />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <DataGridPagination />
            </div>
          </DataGridContainer>
        </DataGrid>
      </CardContent>
      <Dialog
        open={Boolean(editingRow)}
        onOpenChange={(open) => {
          if (!open) setEditingEmployeeId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Настройки KPI</DialogTitle>
            <DialogDescription>
              {editingRow ? (
                <span>
                  Изменение параметров KPI для{" "}
                  <span className="font-medium text-foreground">{editingRow.name}</span>
                </span>
              ) : (
                "Изменение KPI сотрудника"
              )}
            </DialogDescription>
          </DialogHeader>
          {editingRow && editingDraft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kpi-base-salary">
                  Базовый оклад (₽)
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    макс. 1&nbsp;000&nbsp;000
                  </span>
                </Label>
                <Input
                  id="kpi-base-salary"
                  name="kpi-base-salary"
                  type="number"
                  min={0}
                  max={1_000_000}
                  inputMode="numeric"
                  autoComplete="off"
                  className="text-base tabular-nums touch-action-manipulation"
                  value={editingDraft.baseSalary}
                  onChange={(e) =>
                    setDraftField(editingRow.employeeExternalId, "baseSalary", e.target.value)
                  }
                  aria-describedby="kpi-base-salary-hint"
                />
                <p id="kpi-base-salary-hint" className="text-xs text-muted-foreground">
                  Ежемесячный базовый оклад сотрудника
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kpi-target-bonus">
                  Целевой бонус (₽)
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    макс. 1&nbsp;000&nbsp;000
                  </span>
                </Label>
                <Input
                  id="kpi-target-bonus"
                  name="kpi-target-bonus"
                  type="number"
                  min={0}
                  max={1_000_000}
                  inputMode="numeric"
                  autoComplete="off"
                  className="text-base tabular-nums touch-action-manipulation"
                  value={editingDraft.targetBonus}
                  onChange={(e) =>
                    setDraftField(editingRow.employeeExternalId, "targetBonus", e.target.value)
                  }
                  aria-describedby="kpi-target-bonus-hint"
                />
                <p id="kpi-target-bonus-hint" className="text-xs text-muted-foreground">
                  Бонус при 100% выполнении KPI
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kpi-target-talk-time">
                  Целевое время разговоров в месяц (мин)
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    макс. 100&nbsp;000
                  </span>
                </Label>
                <Input
                  id="kpi-target-talk-time"
                  name="kpi-target-talk-time"
                  type="number"
                  min={0}
                  max={100_000}
                  inputMode="numeric"
                  autoComplete="off"
                  className="text-base tabular-nums touch-action-manipulation"
                  value={editingDraft.targetTalkTimeMinutes}
                  onChange={(e) =>
                    setDraftField(
                      editingRow.employeeExternalId,
                      "targetTalkTimeMinutes",
                      e.target.value,
                    )
                  }
                  aria-describedby="kpi-target-talk-time-hint"
                />
                <p id="kpi-target-talk-time-hint" className="text-xs text-muted-foreground">
                  Минимальное время разговоров для получения полного бонуса
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingEmployeeId(null)}
              className="touch-action-manipulation"
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={
                !editingRow ||
                isApplyingBulkKpi ||
                (savingEmployeeId === editingRow.employeeExternalId && updateKpiMutation.isPending)
              }
              className="touch-action-manipulation"
              onClick={() => {
                if (editingRow) void saveRowKpi(editingRow);
              }}
            >
              {editingRow &&
              savingEmployeeId === editingRow.employeeExternalId &&
              updateKpiMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
                  Сохранение…
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Применить KPI всем сотрудникам</DialogTitle>
            <DialogDescription>
              Значения будут установлены одинаковыми для всех сотрудников из текущей таблицы.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-kpi-base-salary">
                Базовый оклад (₽)
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  макс. 1&nbsp;000&nbsp;000
                </span>
              </Label>
              <Input
                id="bulk-kpi-base-salary"
                type="number"
                min={0}
                max={1_000_000}
                inputMode="numeric"
                autoComplete="off"
                className="text-base tabular-nums touch-action-manipulation"
                value={bulkDraft.baseSalary}
                onChange={(e) =>
                  setBulkDraft((prev) => ({
                    ...prev,
                    baseSalary: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-kpi-target-bonus">
                Целевой бонус (₽)
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  макс. 1&nbsp;000&nbsp;000
                </span>
              </Label>
              <Input
                id="bulk-kpi-target-bonus"
                type="number"
                min={0}
                max={1_000_000}
                inputMode="numeric"
                autoComplete="off"
                className="text-base tabular-nums touch-action-manipulation"
                value={bulkDraft.targetBonus}
                onChange={(e) =>
                  setBulkDraft((prev) => ({
                    ...prev,
                    targetBonus: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-kpi-target-talk-time">
                Целевое время разговоров в месяц (мин)
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  макс. 100&nbsp;000
                </span>
              </Label>
              <Input
                id="bulk-kpi-target-talk-time"
                type="number"
                min={0}
                max={100_000}
                inputMode="numeric"
                autoComplete="off"
                className="text-base tabular-nums touch-action-manipulation"
                value={bulkDraft.targetTalkTimeMinutes}
                onChange={(e) =>
                  setBulkDraft((prev) => ({
                    ...prev,
                    targetTalkTimeMinutes: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkEditOpen(false)}
              disabled={isApplyingBulkKpi}
              className="touch-action-manipulation"
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={() => void applyKpiToAllEmployees()}
              disabled={isApplyingBulkKpi}
              className="touch-action-manipulation"
            >
              {isApplyingBulkKpi && <Loader2 className="size-4 animate-spin mr-2" aria-hidden />}
              Применить всем
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
