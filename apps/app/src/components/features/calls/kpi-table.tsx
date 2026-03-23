import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@calls/ui";
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  const [selectedMonth, setSelectedMonth] =
    useState<string>(getCurrentMonthValue);
  const {
    startDate: dFrom,
    endDate: dTo,
    normalizedMonthValue,
  } = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);
  const [draftsByEmployeeId, setDraftsByEmployeeId] = useState<
    Record<string, KpiDraft>
  >({});
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null,
  );

  const { data = [], isPending: loading } = useQuery(
    dFrom && dTo
      ? orpc.statistics.getKpi.queryOptions({
          input: { startDate: dFrom, endDate: dTo },
        })
      : {
          queryKey: ["statistics", "kpi", "skip"],
          queryFn: skipToken,
        },
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
    const parsed = Number.parseInt(value, 10);
    const safeValue = Number.isNaN(parsed) ? 0 : toNonNegativeInt(parsed);
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

    setSavingEmployeeId(row.employeeExternalId);
    try {
      await updateKpiMutation.mutateAsync({
        employeeExternalId: row.employeeExternalId,
        data: {
          kpiBaseSalary: toNonNegativeInt(draft.baseSalary),
          kpiTargetBonus: toNonNegativeInt(draft.targetBonus),
          kpiTargetTalkTimeMinutes: toNonNegativeInt(
            draft.targetTalkTimeMinutes,
          ),
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

  const formatRub = (value: number) =>
    value.toLocaleString("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

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
          <Input
            type="month"
            value={normalizedMonthValue}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-[170px]"
            aria-label="Выбор месяца KPI"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Следующий месяц"
            onClick={() => setSelectedMonth((prev) => shiftMonth(prev, 1))}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSelectedMonth(getCurrentMonthValue())}
            disabled={normalizedMonthValue === getCurrentMonthValue()}
          >
            Текущий
          </Button>
          <span className="text-sm text-muted-foreground capitalize">
            {monthLabel(normalizedMonthValue)}
          </span>
        </div>
      </div>
      <CardContent className="p-0! overflow-x-auto">
        <Table className="op-table">
          <TableHeader>
            <TableRow className="border-none">
              <TableHead>Сотрудник</TableHead>
              <TableHead>Оклад (руб)</TableHead>
              <TableHead>Бонус (руб)</TableHead>
              <TableHead>Цель (мин) / Мес.</TableHead>
              <TableHead>План (мин) / Пер.</TableHead>
              <TableHead>Факт (мин)</TableHead>
              <TableHead>Выполнение (%)</TableHead>
              <TableHead>Бонус за период</TableHead>
              <TableHead>ИТОГО Выплата</TableHead>
              <TableHead className="w-55">Настройки KPI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const draft = draftsByEmployeeId[row.employeeExternalId] ?? {
                baseSalary: row.baseSalary,
                targetBonus: row.targetBonus,
                targetTalkTimeMinutes: row.targetTalkTimeMinutes,
              };
              const rowSaving =
                savingEmployeeId === row.employeeExternalId &&
                updateKpiMutation.isPending;

              return (
                <TableRow key={row.employeeExternalId}>
                  <TableCell className="font-semibold">
                    {row.name} <br />
                    <small className="text-[#999]">{row.email}</small>
                  </TableCell>
                  <TableCell>{formatRub(row.baseSalary)} ₽</TableCell>
                  <TableCell>{formatRub(row.targetBonus)} ₽</TableCell>
                  <TableCell>{row.targetTalkTimeMinutes}</TableCell>
                  <TableCell>{row.periodTargetTalkTimeMinutes}</TableCell>
                  <TableCell
                    className={
                      row.actualTalkTimeMinutes >=
                      row.periodTargetTalkTimeMinutes
                        ? "text-(--status-success)"
                        : "text-(--status-warning)"
                    }
                  >
                    {row.actualTalkTimeMinutes}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#EEE] h-1.5 rounded overflow-hidden">
                        <div
                          className="h-full"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={row.kpiCompletionPercentage}
                          aria-valuetext={`${row.kpiCompletionPercentage}% complete`}
                          aria-label={`Выполнение KPI: ${row.kpiCompletionPercentage}%`}
                          style={{
                            width: `${row.kpiCompletionPercentage}%`,
                            background:
                              row.kpiCompletionPercentage >= 100
                                ? "var(--status-success)"
                                : "var(--status-warning)",
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold">
                        {row.kpiCompletionPercentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatRub(row.calculatedBonus)} ₽
                  </TableCell>
                  <TableCell className="font-bold text-(--brand-primary)">
                    {formatRub(row.totalCalculatedSalary)} ₽
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant="secondary">Сотрудник PBX</Badge>
                      <div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={rowSaving}
                          onClick={() =>
                            setEditingEmployeeId(row.employeeExternalId)
                          }
                        >
                          {rowSaving && (
                            <Loader2
                              className="size-4 animate-spin"
                              aria-hidden
                            />
                          )}
                          Настроить
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Текущие: {formatRub(draft.baseSalary)} /{" "}
                        {formatRub(draft.targetBonus)} /{" "}
                        {draft.targetTalkTimeMinutes} мин
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-8 text-[#888]"
                >
                  Нет данных для отображения
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
