import {
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
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Settings2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const KPI_FIELD_LIMITS: Record<keyof KpiDraft, number> = {
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
const toMonthValue = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
const getCurrentMonthValue = () => toMonthValue(new Date());
const getMonthRange = (monthValue: string) => {
  const [yearRaw, monthRaw] = monthValue.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
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
  if (!Number.isInteger(year) || !Number.isInteger(month))
    return "Текущий месяц";
  return new Date(year, month - 1, 1).toLocaleString("ru-RU", {
    month: "long",
    year: "numeric",
  });
};

export default function KpiTable() {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedMonth, setSelectedMonth] =
    useState<string>(getCurrentMonthValue);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const {
    startDate: dFrom,
    endDate: dTo,
    normalizedMonthValue,
  } = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);
  const currentMonthValue = useMemo(() => getCurrentMonthValue(), []);
  const canGoNextMonth = normalizedMonthValue < currentMonthValue;
  const [draftsByEmployeeId, setDraftsByEmployeeId] = useState<
    Record<string, KpiDraft>
  >({});
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null,
  );

  const { data = [], isPending: loading } = useQuery(
    orpc.statistics.getKpi.queryOptions({
      input: { startDate: dFrom, endDate: dTo },
    }),
  );

  const rows = Array.isArray(data) ? (data as KpiRow[]) : [];
  const kpiQueryKey = useMemo(
    () =>
      orpc.statistics.getKpi.queryKey({
        input: { startDate: dFrom, endDate: dTo },
      }),
    [dFrom, dTo, orpc.statistics.getKpi],
  );

  useEffect(() => {
    const monthFromUrl = searchParams.get("month");
    if (!monthFromUrl) return;
    const { normalizedMonthValue: normalizedFromUrl } =
      getMonthRange(monthFromUrl);
    setSelectedMonth((prev) =>
      prev === normalizedFromUrl ? prev : normalizedFromUrl,
    );
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
    setDraftsByEmployeeId((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        if (!next[row.employeeExternalId]) {
          next[row.employeeExternalId] = {
            baseSalary: row.baseSalary,
            targetBonus: row.targetBonus,
            targetTalkTimeMinutes: row.targetTalkTimeMinutes,
          };
        }
      }
      return next;
    });
  }, [rows]);

  const updateKpiMutation = useMutation(
    orpc.statistics.updateKpiEmployee.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: kpiQueryKey });
      },
    }),
  );

  const toNonNegativeInt = (value: number): number => {
    if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
    return Math.max(0, Math.trunc(value));
  };

  const setDraftField = (
    employeeExternalId: string,
    field: keyof KpiDraft,
    value: string,
  ) => {
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
      const message =
        error instanceof Error ? error.message : "Не удалось сохранить KPI";
      toast.error(message);
      console.error("Failed to update KPI by employee", {
        employeeExternalId: row.employeeExternalId,
        error,
      });
    } finally {
      setSavingEmployeeId(null);
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
          <DataGridColumnHeader
            column={column}
            title="Сотрудник"
            className="min-w-52"
          />
        ),
        cell: ({ row }) => (
          <div className="font-semibold">
            {row.original.name}
            <br />
            <small className="text-[#999]">{row.original.email}</small>
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
        cell: ({ row }) => `${formatRub(row.original.baseSalary)} ₽`,
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
        cell: ({ row }) => `${formatRub(row.original.targetBonus)} ₽`,
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
        cell: ({ row }) => row.original.targetTalkTimeMinutes,
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
        cell: ({ row }) => (
          <span
            className={
              row.original.actualTalkTimeMinutes >=
              row.original.periodTargetTalkTimeMinutes
                ? "text-(--status-success)"
                : "text-(--status-warning)"
            }
          >
            {row.original.actualTalkTimeMinutes}
          </span>
        ),
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
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#EEE] h-1.5 rounded overflow-hidden">
              <div
                className="h-full"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={row.original.kpiCompletionPercentage}
                aria-valuetext={`${row.original.kpiCompletionPercentage}% complete`}
                aria-label={`Выполнение KPI: ${row.original.kpiCompletionPercentage}%`}
                style={{
                  width: `${row.original.kpiCompletionPercentage}%`,
                  background:
                    row.original.kpiCompletionPercentage >= 100
                      ? "var(--status-success)"
                      : "var(--status-warning)",
                }}
              />
            </div>
            <span className="text-xs font-semibold">
              {row.original.kpiCompletionPercentage}%
            </span>
          </div>
        ),
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
          <span className="font-semibold">
            {formatRub(row.original.calculatedBonus)} ₽
          </span>
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
          <span className="font-bold text-(--brand-primary)">
            {formatRub(row.original.totalCalculatedSalary)} ₽
          </span>
        ),
        meta: { headerTitle: "Итого, ₽" },
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
            savingEmployeeId === row.original.employeeExternalId &&
            updateKpiMutation.isPending;
          return (
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={rowSaving}
              aria-label={`Открыть настройки KPI для ${row.original.name}`}
              onClick={() =>
                setEditingEmployeeId(row.original.employeeExternalId)
              }
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
    [formatRub, savingEmployeeId, updateKpiMutation.isPending],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting: [{ id: "employee", desc: false }],
      pagination: { pageSize: 10, pageIndex: 0 },
      columnPinning: { left: ["employee"] },
    },
  });

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

    const csv = [header, ...lines]
      .map((row) => row.map(escapeCsvValue).join(";"))
      .join("\n");
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
      : (rows.find((row) => row.employeeExternalId === editingEmployeeId) ??
        null);
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
      <div className="py-5 px-6 border-b border-[#EEE] flex flex-wrap items-center justify-between gap-3">
        <h3 className="section-title m-0">Расчет KPI сотрудников</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Предыдущий месяц"
            onClick={() => setSelectedMonth((prev) => shiftMonth(prev, -1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="min-w-52 justify-start text-left font-normal"
                aria-label="Выбор месяца KPI"
              >
                <CalendarIcon
                  className="size-4 shrink-0 opacity-70"
                  aria-hidden
                />
                {monthLabel(normalizedMonthValue)}
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
                    Number.parseInt(
                      currentMonthValue.split("-")[1] ?? "1",
                      10,
                    ) - 1,
                    1,
                  )
                }
                onMonthChange={(month) => {
                  setSelectedMonth(toMonthValue(month));
                  setIsMonthPickerOpen(false);
                }}
                disabled={() => true}
                formatters={{
                  formatCaption: (date) =>
                    format(date, "LLLL yyyy", { locale: ru }),
                }}
              />
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Следующий месяц"
            onClick={() => setSelectedMonth((prev) => shiftMonth(prev, 1))}
            disabled={!canGoNextMonth}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSelectedMonth(shiftMonth(currentMonthValue, -1))}
          >
            -1 мес
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSelectedMonth(shiftMonth(currentMonthValue, -3))}
          >
            -3 мес
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSelectedMonth(shiftMonth(currentMonthValue, -6))}
          >
            -6 мес
          </Button>
          <Button
            type="button"
            variant="ghost"
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
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-1">
            <div className="text-sm text-muted-foreground">
              Период: {dFrom} — {dTo}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={exportCurrentMonthCsv}
              >
                <Download className="size-4" aria-hidden />
                Экспорт CSV
              </Button>
              <DataGridColumnVisibility
                table={table}
                trigger={
                  <Button type="button" variant="outline" size="sm">
                    <Settings2 className="size-4" aria-hidden />
                    Колонки
                  </Button>
                }
              />
            </div>
          </div>
          <DataGridContainer className="border-0">
            <div className="max-h-[70vh] overflow-auto">
              <div className="min-w-350">
                <DataGridTable<KpiRow> />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-[#EEE]">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Настройки KPI</DialogTitle>
            <DialogDescription>
              {editingRow
                ? `Изменение KPI для ${editingRow.name}`
                : "Изменение KPI сотрудника"}
            </DialogDescription>
          </DialogHeader>
          {editingRow && editingDraft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kpi-base-salary">Базовый оклад (₽)</Label>
                <Input
                  id="kpi-base-salary"
                  name="kpi-base-salary"
                  type="number"
                  min={0}
                  max={1_000_000}
                  inputMode="numeric"
                  autoComplete="off"
                  value={editingDraft.baseSalary}
                  onChange={(e) =>
                    setDraftField(
                      editingRow.employeeExternalId,
                      "baseSalary",
                      e.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kpi-target-bonus">Целевой бонус (₽)</Label>
                <Input
                  id="kpi-target-bonus"
                  name="kpi-target-bonus"
                  type="number"
                  min={0}
                  max={1_000_000}
                  inputMode="numeric"
                  autoComplete="off"
                  value={editingDraft.targetBonus}
                  onChange={(e) =>
                    setDraftField(
                      editingRow.employeeExternalId,
                      "targetBonus",
                      e.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kpi-target-talk-time">
                  Целевое время разговоров в месяц (мин)
                </Label>
                <Input
                  id="kpi-target-talk-time"
                  name="kpi-target-talk-time"
                  type="number"
                  min={0}
                  max={100_000}
                  inputMode="numeric"
                  autoComplete="off"
                  value={editingDraft.targetTalkTimeMinutes}
                  onChange={(e) =>
                    setDraftField(
                      editingRow.employeeExternalId,
                      "targetTalkTimeMinutes",
                      e.target.value,
                    )
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingEmployeeId(null)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={
                !editingRow ||
                (savingEmployeeId === editingRow.employeeExternalId &&
                  updateKpiMutation.isPending)
              }
              onClick={() => {
                if (editingRow) void saveRowKpi(editingRow);
              }}
            >
              {editingRow &&
              savingEmployeeId === editingRow.employeeExternalId &&
              updateKpiMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {editingRow &&
              savingEmployeeId === editingRow.employeeExternalId &&
              updateKpiMutation.isPending
                ? "Сохранение..."
                : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
