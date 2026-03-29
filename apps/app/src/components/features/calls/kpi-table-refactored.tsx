import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  toast,
} from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Download, Loader2, Settings2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useORPC } from "@/orpc/react";

import KpiMonthPicker, { useKpiMonthUtils } from "./kpi-month-picker";
import KpiTableData from "./kpi-table-data";
import BulkKpiSettings, {
  type BulkKpiSettings as BulkKpiSettingsType,
} from "./bulk-kpi-settings";

const KPI_QUERY_KEY = ["statistics", "kpi"] as const;

const KPI_FIELD_LIMITS = {
  baseSalary: 1000000,
  targetBonus: 1000000,
  targetTalkTimeMinutes: 100000,
} as const;

const kpiDraftSchema = z.object({
  baseSalary: z.number().min(0).max(KPI_FIELD_LIMITS.baseSalary),
  targetBonus: z.number().min(0).max(KPI_FIELD_LIMITS.targetBonus),
  targetTalkTimeMinutes: z
    .number()
    .min(0)
    .max(KPI_FIELD_LIMITS.targetTalkTimeMinutes),
});

type KpiDraft = z.infer<typeof kpiDraftSchema>;

interface KpiRow {
  employeeExternalId: string;
  name: string;
  internalNumber?: string | null;
  baseSalary: number;
  targetBonus: number;
  targetTalkTimeMinutes: number;
  totalCalls?: number | null;
  totalTalkTimeMinutes?: number | null;
  averageValueScore?: number | null;
  completedCallsCount?: number | null;
  conversionRate?: number | null;
  totalRevenue?: number | null;
  calculatedSalary?: number | null;
  calculatedBonus?: number | null;
  calculatedTotal?: number | null;
}

const monthValueSchema = z
  .string()
  .regex(
    /^\d{4}-(0[1-9]|1[0-2])$/,
    "Неверный формат месяца. Используйте ГГГГ-ММ",
  );

function getMonthRange(monthValue: string): { normalizedMonthValue: string } {
  const result = monthValueSchema.safeParse(monthValue);
  if (!result.success) {
    // Если парсинг не удался, используем текущий месяц
    const currentMonth = getCurrentMonthValue();
    return { normalizedMonthValue: currentMonth };
  }

  const [year, month] = result.data.split("-").map(Number);
  return { normalizedMonthValue: `${year}-${String(month).padStart(2, "0")}` };
}

function getCurrentMonthValue(): string {
  return format(new Date(), "yyyy-MM");
}

export default function KpiTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null,
  );
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);
  const [draftsByEmployeeId, setDraftsByEmployeeId] = useState<
    Record<string, Partial<KpiRow>>
  >({});
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const currentMonthValue = getCurrentMonthValue();
  const {
    shiftMonth,
    monthLabel,
    canGoNextMonth: canGoNextMonthUtil,
  } = useKpiMonthUtils();
  const canGoNextMonth = canGoNextMonthUtil(selectedMonth, currentMonthValue);
  const skipInvalidateOnSuccessRef = useRef(false);

  const {
    data: rows = [],
    isLoading,
    error,
  } = useQuery({
    ...orpc.statistics.getKpiEmployees.queryOptions({
      input: { month: selectedMonth },
    }),
    enabled: !!selectedMonth,
  });

  useEffect(() => {
    const monthFromUrl = searchParams.get("month");
    if (monthFromUrl) {
      const { normalizedMonthValue } = getMonthRange(monthFromUrl);
      setSelectedMonth((prev) =>
        prev === normalizedMonthValue ? prev : normalizedMonthValue,
      );
    }
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
        // Перезаписываем существующие drafts значениями из rows
        next[row.employeeExternalId] = {
          baseSalary: row.baseSalary,
          targetBonus: row.targetBonus,
          targetTalkTimeMinutes: row.targetTalkTimeMinutes,
        };
      }
      return next;
    });
  }, [rows]);

  const updateKpiMutation = useMutation(
    orpc.statistics.updateKpiEmployee.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.statistics.getKpiEmployees.queryKey({
            input: { month: selectedMonth },
          }),
        });
      },
    }),
  );

  const bulkUpdateKpiMutation = useMutation(
    orpc.statistics.updateKpiEmployee.mutationOptions({
      onSuccess: async () => {
        if (skipInvalidateOnSuccessRef.current) return;
        await queryClient.invalidateQueries({
          queryKey: orpc.statistics.getKpiEmployees.queryKey({
            input: { month: selectedMonth },
          }),
        });
      },
    }),
  );

  const isApplyingBulkKpi = bulkUpdateKpiMutation.isPending;

  const toNonNegativeInt = (value: number): number => {
    if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
    return Math.max(0, Math.trunc(value));
  };

  const setDraftField = (
    employeeExternalId: string,
    field: keyof KpiRow,
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
      toast.error("Не удалось сохранить KPI");
    } finally {
      setSavingEmployeeId(null);
    }
  };

  const applyKpiToAllEmployees = async (settings: BulkKpiSettingsType) => {
    if (rows.length === 0) {
      toast.error("Нет сотрудников для применения KPI");
      return;
    }

    try {
      skipInvalidateOnSuccessRef.current = false;
      const promises = rows.map((row) =>
        bulkUpdateKpiMutation.mutateAsync({
          employeeExternalId: row.employeeExternalId,
          data: {
            kpiBaseSalary: settings.baseSalary,
            kpiTargetBonus: settings.targetBonus,
            kpiTargetTalkTimeMinutes: settings.targetTalkTimeMinutes,
          },
        }),
      );

      const results = await Promise.allSettled(promises);

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (failed > 0) {
        toast.error(
          `KPI применены к ${successful} из ${rows.length} сотрудников. ${failed} завершились с ошибкой.`,
        );
        // Пробрасываем ошибку дальше чтобы вызывающий код не закрыл диалог
        throw new Error(
          `Частичное применение KPI: ${successful} успешных, ${failed} неудачных`,
        );
      } else {
        toast.success(`KPI применены ко всем ${successful} сотрудникам`);
      }
    } catch (error) {
      if (error.message.includes("Частичное применение")) {
        // Пробрасываем дальше для обработки в вызывающем коде
        throw error;
      }
      toast.error("Не удалось применить KPI ко всем сотрудникам");
    }
  };

  const exportCsv = useCallback(() => {
    if (rows.length === 0) {
      toast.error("Нет данных для экспорта");
      return;
    }

    const headers = [
      "Сотрудник",
      "Внутренний номер",
      "Базовая зарплата",
      "Целевой бонус",
      "Целевое время разговора",
      "Всего звонков",
      "Время разговора",
      "Средняя оценка",
      "Конверсия",
      "Выручка",
      "Начислено зарплата",
      "Начислено бонус",
      "Итого начислено",
    ];

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        [
          `"${row.name}"`,
          row.internalNumber || "",
          row.baseSalary,
          row.targetBonus,
          row.targetTalkTimeMinutes,
          row.totalCalls || "",
          row.totalTalkTimeMinutes || "",
          row.averageValueScore || "",
          row.conversionRate || "",
          row.totalRevenue || "",
          row.calculatedSalary || "",
          row.calculatedBonus || "",
          row.calculatedTotal || "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `kpi-${selectedMonth}-${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV файл экспортирован");
  }, [rows, selectedMonth]);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Ошибка загрузки KPI
            </h3>
            <p className="text-gray-600">
              Не удалось загрузить данные KPI. Попробуйте обновить страницу.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>KPI сотрудников</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBulkEditOpen(true)}
              className="flex items-center gap-2"
            >
              <Settings2 className="h-4 w-4" />
              Применить KPI всем
            </Button>
            <KpiMonthPicker
              selectedMonth={selectedMonth}
              currentMonthValue={currentMonthValue}
              canGoNextMonth={canGoNextMonth}
              isMonthPickerOpen={isMonthPickerOpen}
              setIsMonthPickerOpen={setIsMonthPickerOpen}
              onMonthChange={setSelectedMonth}
              onShiftMonth={(direction) =>
                setSelectedMonth(shiftMonth(selectedMonth, direction))
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <KpiTableData
          rows={rows}
          isLoading={isLoading}
          editingEmployeeId={editingEmployeeId}
          savingEmployeeId={savingEmployeeId}
          draftsByEmployeeId={draftsByEmployeeId}
          onEditEmployee={setEditingEmployeeId}
          onSaveRow={saveRowKpi}
          onCancelEdit={() => setEditingEmployeeId(null)}
          onDraftFieldChange={setDraftField}
          onExportCsv={exportCsv}
        />

        <BulkKpiSettings
          isOpen={isBulkEditOpen}
          onClose={() => setIsBulkEditOpen(false)}
          onApply={applyKpiToAllEmployees}
          isLoading={isApplyingBulkKpi}
        />
      </CardContent>
    </Card>
  );
}
