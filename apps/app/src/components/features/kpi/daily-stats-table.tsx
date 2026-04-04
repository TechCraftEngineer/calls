"use client";

import type { DailyKpiRow } from "@calls/api/routers/statistics/get-kpi-daily";
import {
  Button,
  Card,
  cn,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@calls/ui";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { formatCurrency, getColorByPercentage } from "@/lib/kpi-utils";
import { ExportButton } from "./export-button";

interface DailyStatsTableProps {
  data: DailyKpiRow[];
  loading: boolean;
  employeeName: string;
  startDate: string;
  endDate: string;
}

const ITEMS_PER_PAGE = 30;

// Цветовые классы для строк
const getRowColorClass = (percentage: number): string => {
  const color = getColorByPercentage(percentage);
  if (color === "green")
    return "bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-950/30";
  if (color === "yellow")
    return "bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/30";
  return "bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30";
};

// Skeleton для загрузки
function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// Empty state
const EmptyState = React.memo(function EmptyState() {
  return (
    <Card className="p-12 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="text-muted-foreground text-lg font-medium">Нет данных для отображения</div>
        <div className="text-muted-foreground text-sm">Попробуйте выбрать другой период</div>
      </div>
    </Card>
  );
});

export const DailyStatsTable = React.memo(function DailyStatsTable({
  data,
  loading,
  employeeName,
  startDate,
  endDate,
}: DailyStatsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [isMobile, setIsMobile] = React.useState(false);

  // Определяем мобильное устройство
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Вычисляем накопительные итоги
  const totals = React.useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalCalls: 0,
        incoming: 0,
        outgoing: 0,
        missed: 0,
        actualTalkTimeMinutes: 0,
        targetTalkTimeMinutes: 0,
        dailyBonus: 0,
        completionPercentage: 0,
      };
    }

    const sums = data.reduce(
      (acc, row) => ({
        totalCalls: acc.totalCalls + row.totalCalls,
        incoming: acc.incoming + row.incoming,
        outgoing: acc.outgoing + row.outgoing,
        missed: acc.missed + row.missed,
        actualTalkTimeMinutes: acc.actualTalkTimeMinutes + row.actualTalkTimeMinutes,
        targetTalkTimeMinutes: acc.targetTalkTimeMinutes + row.targetTalkTimeMinutes,
        dailyBonus: acc.dailyBonus + row.dailyBonus,
      }),
      {
        totalCalls: 0,
        incoming: 0,
        outgoing: 0,
        missed: 0,
        actualTalkTimeMinutes: 0,
        targetTalkTimeMinutes: 0,
        dailyBonus: 0,
      },
    );

    const completionPercentage =
      sums.targetTalkTimeMinutes > 0
        ? Math.min(100, Math.round((sums.actualTalkTimeMinutes / sums.targetTalkTimeMinutes) * 100))
        : 0;

    return { ...sums, completionPercentage };
  }, [data]);

  // Определяем колонки
  const columns = React.useMemo<ColumnDef<DailyKpiRow>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              aria-label={`Сортировать по дате ${isSorted === "asc" ? "по убыванию" : "по возрастанию"}`}
            >
              Дата
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const date = new Date(row.original.date);
          return date.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        },
      },
      {
        accessorKey: "incoming",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              aria-label={`Сортировать по входящим ${isSorted === "asc" ? "по убыванию" : "по возрастанию"}`}
            >
              Входящие
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => row.original.incoming,
      },
      {
        accessorKey: "outgoing",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              aria-label={`Сортировать по исходящим ${isSorted === "asc" ? "по убыванию" : "по возрастанию"}`}
            >
              Исходящие
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => row.original.outgoing,
      },
      {
        accessorKey: "missed",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              aria-label={`Сортировать по пропущенным ${isSorted === "asc" ? "по убыванию" : "по возрастанию"}`}
            >
              Пропущенные
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => row.original.missed,
      },
      {
        accessorKey: "totalCalls",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              aria-label={`Сортировать по всего ${isSorted === "asc" ? "по убыванию" : "по возрастанию"}`}
            >
              Всего
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => row.original.totalCalls,
      },
      {
        accessorKey: "actualTalkTimeMinutes",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              aria-label={`Сортировать по времени разговоров ${isSorted === "asc" ? "по убыванию" : "по возрастанию"}`}
            >
              Время разговоров
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => `${row.original.actualTalkTimeMinutes} мин`,
      },
      {
        accessorKey: "targetTalkTimeMinutes",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              aria-label={`Сортировать по цели ${isSorted === "asc" ? "по убыванию" : "по возрастанию"}`}
            >
              Цель
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => `${row.original.targetTalkTimeMinutes} мин`,
      },
      {
        accessorKey: "completionPercentage",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              aria-label={`Сортировать по выполнению ${isSorted === "asc" ? "по убыванию" : "по возрастанию"}`}
            >
              Выполнение %
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => `${row.original.completionPercentage}%`,
      },
      {
        accessorKey: "dailyBonus",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              aria-label={`Сортировать по бонусу ${isSorted === "asc" ? "по убыванию" : "по возрастанию"}`}
            >
              Бонус
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => formatCurrency(row.original.dailyBonus),
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: ITEMS_PER_PAGE,
      },
    },
  });

  if (loading) {
    return <TableSkeleton />;
  }

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  // Мобильная версия с карточками
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Заголовок с кнопкой экспорта */}
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-lg font-semibold">{employeeName}</h3>
            <p className="text-muted-foreground text-sm">
              {new Date(startDate).toLocaleDateString("ru-RU")} -{" "}
              {new Date(endDate).toLocaleDateString("ru-RU")}
            </p>
          </div>
          <ExportButton
            data={data}
            employeeName={employeeName}
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        {/* Карточки для мобильных */}
        <div className="space-y-3">
          {data.map((row, index) => (
            <Card key={index} className={cn("p-4", getRowColorClass(row.completionPercentage))}>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold">
                    {new Date(row.date).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      row.completionPercentage >= 100
                        ? "text-green-600 dark:text-green-400"
                        : row.completionPercentage >= 80
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {row.completionPercentage}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Входящие</div>
                    <div className="font-medium">{row.incoming}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Исходящие</div>
                    <div className="font-medium">{row.outgoing}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Пропущенные</div>
                    <div className="font-medium">{row.missed}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Всего</div>
                    <div className="font-medium">{row.totalCalls}</div>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Время разговоров:</span>
                    <span className="font-medium">{row.actualTalkTimeMinutes} мин</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Цель:</span>
                    <span className="font-medium">{row.targetTalkTimeMinutes} мин</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Бонус:</span>
                    <span className="font-medium">{formatCurrency(row.dailyBonus)}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Итоговая карточка */}
        <Card className="bg-muted/50 p-4">
          <div className="space-y-3">
            <div className="font-semibold border-b pb-2">Итого за период</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Входящие</div>
                <div className="font-medium">{totals.incoming}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Исходящие</div>
                <div className="font-medium">{totals.outgoing}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Пропущенные</div>
                <div className="font-medium">{totals.missed}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Всего</div>
                <div className="font-medium">{totals.totalCalls}</div>
              </div>
            </div>
            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Время разговоров:</span>
                <span className="font-medium">{totals.actualTalkTimeMinutes} мин</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Цель:</span>
                <span className="font-medium">{totals.targetTalkTimeMinutes} мин</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Выполнение:</span>
                <span className="font-medium">{totals.completionPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Бонус:</span>
                <span className="font-medium">{formatCurrency(totals.dailyBonus)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Десктопная версия с таблицей
  return (
    <div className="space-y-4">
      {/* Заголовок с кнопкой экспорта */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{employeeName}</h3>
          <p className="text-muted-foreground text-sm">
            {new Date(startDate).toLocaleDateString("ru-RU")} -{" "}
            {new Date(endDate).toLocaleDateString("ru-RU")}
          </p>
        </div>
        <ExportButton
          data={data}
          employeeName={employeeName}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      {/* Таблица */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(getRowColorClass(row.original.completionPercentage))}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>Итого</TableCell>
                <TableCell>{totals.incoming}</TableCell>
                <TableCell>{totals.outgoing}</TableCell>
                <TableCell>{totals.missed}</TableCell>
                <TableCell>{totals.totalCalls}</TableCell>
                <TableCell>{totals.actualTalkTimeMinutes} мин</TableCell>
                <TableCell>{totals.targetTalkTimeMinutes} мин</TableCell>
                <TableCell>{totals.completionPercentage}%</TableCell>
                <TableCell>{formatCurrency(totals.dailyBonus)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Card>

      {/* Пагинация */}
      {data.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Показано {table.getState().pagination.pageIndex * ITEMS_PER_PAGE + 1}-
            {Math.min((table.getState().pagination.pageIndex + 1) * ITEMS_PER_PAGE, data.length)} из{" "}
            {data.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Предыдущая страница"
              className="min-h-[44px] min-w-[44px]"
            >
              <ChevronLeft className="h-4 w-4" />
              Назад
            </Button>
            <div className="text-sm">
              Страница {table.getState().pagination.pageIndex + 1} из {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Следующая страница"
              className="min-h-[44px] min-w-[44px]"
            >
              Вперед
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
