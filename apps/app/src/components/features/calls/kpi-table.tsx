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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export default function KpiTable({
  dateFrom,
  dateTo,
}: {
  dateFrom: string;
  dateTo: string;
}) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const dFrom = dateFrom || new Date().toISOString().split("T")[0];
  const dTo = dateTo || new Date().toISOString().split("T")[0];
  const [draftsByEmployeeId, setDraftsByEmployeeId] = useState<
    Record<string, KpiDraft>
  >({});
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null,
  );

  const { data = [], isPending: loading } = useQuery({
    ...orpc.statistics.getKpi.queryOptions({
      input: { startDate: dFrom, endDate: dTo },
    }),
    enabled: !!dFrom && !!dTo,
  });

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
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "Не удалось сохранить KPI";
        toast.error(message);
      },
      onSettled: () => {
        setSavingEmployeeId(null);
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
    await updateKpiMutation.mutateAsync({
      employeeExternalId: row.employeeExternalId,
      data: {
        kpiBaseSalary: toNonNegativeInt(draft.baseSalary),
        kpiTargetBonus: toNonNegativeInt(draft.targetBonus),
        kpiTargetTalkTimeMinutes: toNonNegativeInt(draft.targetTalkTimeMinutes),
      },
    });
    toast.success(`KPI для ${row.name} сохранены`);
    setEditingEmployeeId(null);
  };

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
      <div className="py-5 px-6 border-b border-[#EEE]">
        <h3 className="section-title m-0">Расчет KPI сотрудников</h3>
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
                  <TableCell>{row.baseSalary.toLocaleString()} ₽</TableCell>
                  <TableCell>{row.targetBonus.toLocaleString()} ₽</TableCell>
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
                    {row.calculatedBonus.toLocaleString()} ₽
                  </TableCell>
                  <TableCell className="font-bold text-(--brand-primary)">
                    {row.totalCalculatedSalary.toLocaleString()} ₽
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
                          {rowSaving ? "Сохранение..." : "Настроить"}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Текущие: {draft.baseSalary.toLocaleString()} /{" "}
                        {draft.targetBonus.toLocaleString()} /{" "}
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
        <DialogContent>
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
                  type="number"
                  min={0}
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
                  type="number"
                  min={0}
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
                  type="number"
                  min={0}
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
