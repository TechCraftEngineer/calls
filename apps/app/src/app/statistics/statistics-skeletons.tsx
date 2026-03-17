"use client";

import {
  Card,
  CardContent,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calls/ui";

const SKELETON_ROW_COUNT = 6;

export function StatisticsTableSkeleton() {
  return (
    <Card className="card p-0! overflow-hidden">
      <div className="py-5 px-6 border-b border-[#EEE]">
        <Skeleton className="h-6 w-72" />
      </div>
      <div className="overflow-x-auto">
        <Table className="op-table">
          <TableHeader>
            <TableRow className="border-none">
              <TableHead>Сотрудник</TableHead>
              <TableHead>Внутренний номер</TableHead>
              <TableHead>Исходящие</TableHead>
              <TableHead>Входящие</TableHead>
              <TableHead>Исх (мин)</TableHead>
              <TableHead>Вх (мин)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-5 w-36" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-14" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-14" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export function KpiTableSkeleton() {
  return (
    <Card className="card p-0! overflow-hidden mt-6">
      <div className="py-5 px-6 border-b border-[#EEE]">
        <Skeleton className="h-6 w-56" />
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-10" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-1.5 flex-1 rounded" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function StatisticsSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="card">
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="card">
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StatisticsPageSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      <header className="page-header mb-8">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-80" />
      </header>
      <div className="flex gap-0 border-b-2 border-[#EEE] mb-6">
        <Skeleton className="h-12 w-40 rounded-none" />
        <Skeleton className="h-12 w-32 rounded-none" />
        <Skeleton className="h-12 w-44 rounded-none" />
      </div>
      <Card className="card mb-6">
        <CardContent className="p-6">
          <div className="flex gap-6 flex-wrap items-end">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-40" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-40" />
            </div>
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
      <StatisticsTableSkeleton />
    </div>
  );
}
