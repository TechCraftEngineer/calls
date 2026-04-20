import { Badge, Button } from "@calls/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Loader2, Phone, Settings2, TrendingUp } from "lucide-react";
import { formatCurrency, formatMinutes } from "./kpi-table-formatters";
import { KpiTableHeader } from "./kpi-table-header";
import type { KpiRow } from "./kpi-table-types";

export const createKpiTableColumns = (
  onEditEmployee: (employeeId: string) => void,
  savingEmployeeId: string | null,
  isApplyingBulkKpi: boolean,
): ColumnDef<KpiRow>[] => [
  {
    id: "employee",
    accessorKey: "name",
    size: 300,
    minSize: 300,
    header: "Сотрудник",
    cell: ({ row }) => (
      <div className="flex items-start gap-3 py-1">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Phone className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground truncate">{row.getValue("name")}</div>
          <div className="text-sm text-muted-foreground truncate">
            {row.original.internalNumber || "—"}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "baseSalary",
    accessorFn: (row) => row.baseSalary,
    header: () => (
      <KpiTableHeader label="Оклад" tooltip="Фиксированная часть зарплаты сотрудника за месяц" />
    ),
    cell: ({ row }) => (
      <div className="font-medium tabular-nums">{formatCurrency(row.getValue("baseSalary"))}</div>
    ),
  },
  {
    id: "targetBonus",
    accessorFn: (row) => row.targetBonus,
    header: () => (
      <KpiTableHeader
        label="Макс. бонус"
        tooltip="Максимальный бонус при 100% выполнении плана по времени разговоров"
      />
    ),
    cell: ({ row }) => (
      <div className="font-medium tabular-nums text-emerald-600">
        {formatCurrency(row.getValue("targetBonus"))}
      </div>
    ),
  },
  {
    id: "targetTalkTimeMinutes",
    accessorFn: (row) => row.targetTalkTimeMinutes,
    header: () => (
      <KpiTableHeader
        label="План"
        tooltip="Целевое время разговоров в минутах за месяц для получения полного бонуса"
      />
    ),
    cell: ({ row }) => (
      <div className="tabular-nums text-muted-foreground">
        {row.getValue("targetTalkTimeMinutes")}
      </div>
    ),
  },
  {
    id: "totalTalkTimeMinutes",
    accessorFn: (row) => row.actualTalkTimeMinutes,
    header: () => (
      <KpiTableHeader
        label="Факт"
        tooltip="Фактическое время разговоров в минутах за выбранный период"
      />
    ),
    cell: ({ row }) => {
      const targetMinutes = row.original.targetTalkTimeMinutes;
      const actualMinutes = row.original.actualTalkTimeMinutes || 0;
      const isOnTarget = actualMinutes >= targetMinutes;

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
            {formatMinutes(actualMinutes)}
          </span>
        </div>
      );
    },
  },
  {
    id: "completionRate",
    accessorFn: (row) => {
      const target = row.targetTalkTimeMinutes;
      const actual = row.actualTalkTimeMinutes || 0;
      return target > 0 ? actual / target : 0;
    },
    header: () => (
      <KpiTableHeader
        label="Выполнение"
        tooltip="Процент выполнения плана. 100% и выше — полный бонус, ниже — пропорционально"
      />
    ),
    cell: ({ row }) => {
      const target = row.original.targetTalkTimeMinutes;
      const actual = row.original.actualTalkTimeMinutes || 0;
      const percentage = target > 0 ? (actual / target) * 100 : 0;
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
                aria-valuetext={`${percentage.toFixed(1)}% выполнено`}
                aria-label={`Выполнение KPI: ${percentage.toFixed(1)}%`}
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
            {percentage.toFixed(1)}%
          </Badge>
        </div>
      );
    },
  },
  {
    id: "calculatedBonus",
    accessorFn: (row) => row.calculatedBonus,
    header: () => (
      <KpiTableHeader
        label="Начислено"
        tooltip="Рассчитанный бонус за выбранный период на основе процента выполнения плана"
      />
    ),
    cell: ({ row }) => {
      const value = row.original.calculatedBonus;
      const formatted = formatCurrency(value);
      return (
        <div className="font-semibold tabular-nums text-emerald-600">
          {value != null && value !== 0 && Number.isFinite(value) ? `+${formatted}` : formatted}
        </div>
      );
    },
  },
  {
    id: "calculatedTotal",
    accessorFn: (row) => row.totalCalculatedSalary,
    minSize: 160,
    header: () => (
      <KpiTableHeader
        label="Итого к выплате"
        tooltip="Общая сумма к выплате: оклад + начисленный бонус за период"
      />
    ),
    cell: ({ row }) => (
      <div className="font-bold tabular-nums text-blue-600">
        {formatCurrency(row.original.totalCalculatedSalary)}
      </div>
    ),
  },
  {
    id: "actions",
    accessorKey: "employeeExternalId",
    header: "Настройки",
    enableSorting: false,
    cell: ({ row }) => {
      const rowSaving = savingEmployeeId === row.getValue("employeeExternalId");

      return (
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={rowSaving || isApplyingBulkKpi}
          className="touch-action-manipulation"
          aria-label={`Открыть настройки KPI для ${row.getValue("name")}`}
          onClick={() => onEditEmployee(row.getValue("employeeExternalId"))}
        >
          {rowSaving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Settings2 className="size-4" aria-hidden />
          )}
        </Button>
      );
    },
  },
];
