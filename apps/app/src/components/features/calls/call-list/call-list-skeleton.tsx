"use client";

import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calls/ui";
import { loadColumnOrder } from "./column-storage";
import { COLUMNS } from "./constants";

const SKELETON_ROW_COUNT = 8;

export function CallListSkeleton() {
  const columnOrder = loadColumnOrder();
  const orderedColumns = columnOrder
    .map((key) => COLUMNS.find((col) => col.key === key))
    .filter((col): col is (typeof COLUMNS)[number] => col !== undefined);

  return (
    <div className="relative">
      <Table className="op-table">
        <TableHeader>
          <TableRow className="border-none">
            {orderedColumns.map((col) => (
              <TableHead key={col.key} className="py-3">
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
            <TableRow key={i} className="border-b">
              {orderedColumns.map((col) => (
                <TableCell key={col.key} className="py-3 px-4">
                  <Skeleton
                    className={
                      col.key === "summary"
                        ? "h-4 w-full max-w-[200px]"
                        : col.key === "record"
                          ? "h-8 w-8 rounded"
                          : "h-4 w-16"
                    }
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
