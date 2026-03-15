"use client";

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@calls/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { PAGINATION_CONSTANTS } from "@/constants/pagination";

interface TablePaginationProps {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

export function TablePagination({
  page,
  perPage,
  total,
  totalPages,
  onPageChange,
  onPerPageChange,
}: TablePaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="border-t flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="text-muted-foreground text-sm">
          Показано {start}–{end} из {total}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground whitespace-nowrap text-sm">
            Строк на странице
          </span>
          <Select
            value={String(perPage)}
            onValueChange={(v) => onPerPageChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[70px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {PAGINATION_CONSTANTS.PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <p className="text-muted-foreground whitespace-nowrap text-sm">
          Страница {page} из {totalPages || 1}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Предыдущая страница"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Следующая страница"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
