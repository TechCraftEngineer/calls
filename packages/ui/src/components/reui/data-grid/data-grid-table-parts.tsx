"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Cell,
  Column,
  flexRender,
  Header,
  HeaderGroup,
  Row,
} from "@tanstack/react-table";
import { useDataGrid } from "./data-grid";
import {
  bodyCellSpacingVariants,
  getPinningStyles,
  headerCellSpacingVariants,
} from "./data-grid-table-variants";
import { cn } from "../../../lib/utils";
import { Checkbox } from "../../checkbox";

function DataGridTableBase({ children }: { children: ReactNode }) {
  const { props, table } = useDataGrid();

  return (
    <table
      data-slot="data-grid-table"
      className={cn(
        "text-foreground text-sm w-full min-w-full caption-bottom text-left align-middle font-normal rtl:text-right",
        props.tableLayout?.width === "auto" ? "table-auto" : "table-fixed",
        !props.tableLayout?.columnsResizable && "",
        !props.tableLayout?.columnsDraggable &&
          "border-separate border-spacing-0",
        props.tableClassNames?.base,
      )}
      style={
        props.tableLayout?.columnsResizable
          ? { width: table.getTotalSize() }
          : undefined
      }
    >
      {children}
    </table>
  );
}

function DataGridTableHead({ children }: { children: ReactNode }) {
  const { props } = useDataGrid();

  return (
    <thead
      className={cn(
        props.tableClassNames?.header,
        props.tableLayout?.headerSticky && props.tableClassNames?.headerSticky,
      )}
    >
      {children}
    </thead>
  );
}

function DataGridTableHeadRow<TData>({
  children,
  headerGroup,
}: {
  children: ReactNode;
  headerGroup: HeaderGroup<TData>;
}) {
  const { props } = useDataGrid();

  return (
    <tr
      key={headerGroup.id}
      className={cn(
        "bg-muted/40",
        props.tableLayout?.headerBorder && "[&>th]:border-b",
        props.tableLayout?.cellBorder && "*:last:border-e-0",
        props.tableLayout?.stripped && "bg-transparent",
        props.tableLayout?.headerBackground === false && "bg-transparent",
        props.tableClassNames?.headerRow,
      )}
    >
      {children}
    </tr>
  );
}

function DataGridTableHeadRowCell<TData>({
  children,
  header,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  header: Header<TData, unknown>;
  dndRef?: React.Ref<HTMLTableCellElement>;
  dndStyle?: CSSProperties;
}) {
  const { props } = useDataGrid();

  const { column } = header;
  const isPinned = column.getIsPinned();
  const isLastLeftPinned = isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRightPinned =
    isPinned === "right" && column.getIsFirstColumn("right");
  const headerCellSpacing = headerCellSpacingVariants({
    size: props.tableLayout?.dense ? "dense" : "default",
  });

  return (
    <th
      key={header.id}
      ref={dndRef}
      style={{
        ...((props.tableLayout?.width === "fixed" ||
          props.tableLayout?.columnsResizable) && {
          width: header.getSize(),
        }),
        ...(props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          getPinningStyles(column)),
        ...(dndStyle ? dndStyle : null),
      }}
      data-pinned={isPinned || undefined}
      data-last-col={
        isLastLeftPinned ? "left" : isFirstRightPinned ? "right" : undefined
      }
      className={cn(
        "text-secondary-foreground/80 h-9 relative text-left align-middle font-normal rtl:text-right [&:has([role=checkbox])]:pe-0",
        headerCellSpacing,
        props.tableLayout?.cellBorder && "border-e",
        props.tableLayout?.columnsResizable &&
          column.getCanResize() &&
          "truncate",
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          "[&[data-pinned][data-last-col]]:border-border data-pinned:bg-muted/90 data-pinned:backdrop-blur-xs [&:not([data-pinned]):has(+[data-pinned])_div.cursor-col-resize:last-child]:opacity-0 [&[data-last-col=left]_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right]:last-child_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=right][data-last-col=right]]:border-s!",
        header.column.columnDef.meta?.headerClassName,
        column.getIndex() === 0 ||
          column.getIndex() === header.headerGroup.headers.length - 1
          ? props.tableClassNames?.edgeCell
          : "",
      )}
    >
      {children}
    </th>
  );
}

function DataGridTableHeadRowCellResize<TData>({
  header,
}: {
  header: Header<TData, unknown>;
}) {
  const { column } = header;

  return (
    <div
      {...{
        onDoubleClick: () => column.resetSize(),
        onMouseDown: header.getResizeHandler(),
        onTouchStart: header.getResizeHandler(),
        className:
          "absolute top-0 h-full w-4 cursor-col-resize user-select-none touch-none -end-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-border before:-translate-x-px",
      }}
    />
  );
}

function DataGridTableRowSpacer() {
  return <tbody aria-hidden="true" className="h-2"></tbody>;
}

function DataGridTableBody({ children }: { children: ReactNode }) {
  const { props } = useDataGrid();

  return (
    <tbody
      className={cn(
        "[&_tr:last-child]:border-0",
        props.tableLayout?.rowRounded &&
          "[&_td:first-child]:rounded-l-lg",
        props.tableLayout?.rowRounded &&
          "[&_td:last-child]:rounded-r-lg",
        props.tableClassNames?.body,
      )}
    >
      {children}
    </tbody>
  );
}

function DataGridTableBodyRowSkeleton({ children }: { children: ReactNode }) {
  const { table, props } = useDataGrid();

  return (
    <tr
      className={cn(
        "hover:bg-muted/40 data-[state=selected]:bg-muted/50",
        props.onRowClick && "cursor-pointer",
        !props.tableLayout?.stripped &&
          props.tableLayout?.rowBorder &&
          "border-border border-b [&:not(:last-child)>td]:border-b",
        props.tableLayout?.cellBorder && "*:last:border-e-0",
        props.tableLayout?.stripped &&
          "odd:bg-muted/90 odd:hover:bg-muted hover:bg-transparent",
        table.options.enableRowSelection && "*:first:relative",
        props.tableClassNames?.bodyRow,
      )}
    >
      {children}
    </tr>
  );
}

function DataGridTableBodyRowSkeletonCell<TData>({
  children,
  column,
}: {
  children: ReactNode;
  column: Column<TData>;
}) {
  const { props, table } = useDataGrid();
  const bodyCellSpacing = bodyCellSpacingVariants({
    size: props.tableLayout?.dense ? "dense" : "default",
  });

  return (
    <td
      style={
        props.tableLayout?.columnsResizable
          ? { width: column.getSize() }
          : undefined
      }
      className={cn(
        "align-middle",
        bodyCellSpacing,
        props.tableLayout?.cellBorder && "border-e",
        props.tableLayout?.columnsResizable &&
          column.getCanResize() &&
          "truncate",
        column.columnDef.meta?.cellClassName,
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          '[&[data-pinned][data-last-col]]:border-border data-pinned:bg-background/90 data-pinned:backdrop-blur-xs [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s!',
        column.getIndex() === 0 ||
          column.getIndex() === table.getVisibleFlatColumns().length - 1
          ? props.tableClassNames?.edgeCell
          : "",
      )}
    >
      {children}
    </td>
  );
}

function DataGridTableBodyRow<TData>({
  children,
  row,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  row: Row<TData>;
  dndRef?: React.Ref<HTMLTableRowElement>;
  dndStyle?: CSSProperties;
}) {
  const { props, table } = useDataGrid();

  return (
    <tr
      ref={dndRef}
      style={{ ...(dndStyle ? dndStyle : null) }}
      data-state={
        table.options.enableRowSelection && row.getIsSelected()
          ? "selected"
          : undefined
      }
      onClick={() => props.onRowClick && props.onRowClick(row.original)}
      className={cn(
        "hover:bg-muted/40 data-[state=selected]:bg-muted/50",
        props.onRowClick && "cursor-pointer",
        !props.tableLayout?.stripped &&
          props.tableLayout?.rowBorder &&
          "border-border border-b [&:not(:last-child)>td]:border-b",
        props.tableLayout?.cellBorder && "*:last:border-e-0",
        props.tableLayout?.stripped &&
          "odd:bg-muted/90 odd:hover:bg-muted hover:bg-transparent",
        table.options.enableRowSelection && "*:first:relative",
        props.tableClassNames?.bodyRow,
      )}
    >
      {children}
    </tr>
  );
}

function DataGridTableBodyRowExpandded<TData>({ row }: { row: Row<TData> }) {
  const { props, table } = useDataGrid();

  return (
    <tr
      className={cn(
        props.tableLayout?.rowBorder && "[&:not(:last-child)>td]:border-b",
      )}
    >
      <td colSpan={row.getVisibleCells().length}>
        {table
          .getAllColumns()
          .find((column) => column.columnDef.meta?.expandedContent)
          ?.columnDef.meta?.expandedContent?.(row.original)}
      </td>
    </tr>
  );
}

function DataGridTableBodyRowCell<TData>({
  children,
  cell,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  cell: Cell<TData, unknown>;
  dndRef?: React.Ref<HTMLTableCellElement>;
  dndStyle?: CSSProperties;
}) {
  const { props } = useDataGrid();

  const { column, row } = cell;
  const isPinned = column.getIsPinned();
  const isLastLeftPinned = isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRightPinned =
    isPinned === "right" && column.getIsFirstColumn("right");
  const bodyCellSpacing = bodyCellSpacingVariants({
    size: props.tableLayout?.dense ? "dense" : "default",
  });

  return (
    <td
      key={cell.id}
      ref={dndRef}
      {...(props.tableLayout?.columnsDraggable && !isPinned ? { cell } : {})}
      style={{
        ...(props.tableLayout?.columnsResizable && {
          width: column.getSize(),
        }),
        ...(props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          getPinningStyles(column)),
        ...(dndStyle ? dndStyle : null),
      }}
      data-pinned={isPinned || undefined}
      data-last-col={
        isLastLeftPinned ? "left" : isFirstRightPinned ? "right" : undefined
      }
      className={cn(
        "align-middle",
        bodyCellSpacing,
        props.tableLayout?.cellBorder && "border-e",
        props.tableLayout?.columnsResizable &&
          column.getCanResize() &&
          "truncate",
        cell.column.columnDef.meta?.cellClassName,
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          '[&[data-pinned][data-last-col]]:border-border data-pinned:bg-background/90 data-pinned:backdrop-blur-xs [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s!',
        column.getIndex() === 0 ||
          column.getIndex() === row.getVisibleCells().length - 1
          ? props.tableClassNames?.edgeCell
          : "",
      )}
    >
      {children}
    </td>
  );
}

function DataGridTableEmpty() {
  const { table, props } = useDataGrid();
  const totalColumns = table.getAllColumns().length;

  return (
    <tr>
      <td
        colSpan={totalColumns}
        className="text-muted-foreground text-sm py-6 text-center"
      >
        {props.emptyMessage || "Нет данных"}
      </td>
    </tr>
  );
}

function DataGridTableLoader() {
  const { props } = useDataGrid();

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="text-muted-foreground bg-card rounded-lg text-sm flex items-center gap-2 border px-4 py-2 leading-none font-medium">
        <svg
          className="text-muted-foreground -ml-1 h-5 w-5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        {props.loadingMessage || "Загрузка…"}
      </div>
    </div>
  );
}

function DataGridTableRowSelect<TData>({ row }: { row: Row<TData> }) {
  return (
    <>
      <div
        className={cn(
          "bg-primary absolute start-0 top-0 bottom-0 hidden w-[2px]",
          row.getIsSelected() && "block",
        )}
      ></div>
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Выбрать строку"
        className="align-[inherit]"
      />
    </>
  );
}

function DataGridTableRowSelectAll() {
  const { table, recordCount, isLoading } = useDataGrid();

  const isAllSelected = table.getIsAllPageRowsSelected();
  const isSomeSelected = table.getIsSomePageRowsSelected();

  return (
    <Checkbox
      checked={
        isSomeSelected && !isAllSelected ? "indeterminate" : isAllSelected
      }
      disabled={isLoading || recordCount === 0}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Выбрать все"
      className="align-[inherit]"
    />
  );
}

export {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableLoader,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
  DataGridTableRowSpacer,
};
