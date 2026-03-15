"use client";

import type { ReactNode } from "react";
import type { Column, Table } from "@tanstack/react-table";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "../../dropdown-menu";
import { IconPlaceholder } from "../../icon-placeholder";

interface SortMenuItemsProps<TData, TValue> {
  column: Column<TData, TValue>;
  isSorted: false | "asc" | "desc";
  canSort: boolean;
}

export function SortMenuItems<TData, TValue>({
  column,
  isSorted,
  canSort,
}: SortMenuItemsProps<TData, TValue>) {
  if (!canSort) return null;

  return (
    <>
      <DropdownMenuItem
        onClick={() => {
          if (isSorted === "asc") {
            column.clearSorting();
          } else {
            column.toggleSorting(false);
          }
        }}
        disabled={!canSort}
      >
        <IconPlaceholder
          lucide="ArrowUpIcon"
          tabler="IconArrowUp"
          hugeicons="ArrowUp02Icon"
          phosphor="ArrowUpIcon"
          remixicon="RiArrowUpLine"
          className="size-3.5!"
        />
        <span className="grow">Asc</span>
        {isSorted === "asc" && (
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
            className="text-primary size-4 opacity-100!"
          />
        )}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          if (isSorted === "desc") {
            column.clearSorting();
          } else {
            column.toggleSorting(true);
          }
        }}
        disabled={!canSort}
      >
        <IconPlaceholder
          lucide="ArrowDownIcon"
          tabler="IconArrowDown"
          hugeicons="ArrowDown02Icon"
          phosphor="ArrowDownIcon"
          remixicon="RiArrowDownLine"
          className="size-3.5!"
        />
        <span className="grow">Desc</span>
        {isSorted === "desc" && (
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
            className="text-primary size-4 opacity-100!"
          />
        )}
      </DropdownMenuItem>
    </>
  );
}

interface PinMenuItemsProps<TData, TValue> {
  column: Column<TData, TValue>;
  isPinned: "left" | "right" | false;
  canPin: boolean;
}

export function PinMenuItems<TData, TValue>({
  column,
  isPinned,
  canPin,
}: PinMenuItemsProps<TData, TValue>) {
  if (!canPin) return null;

  return (
    <>
      <DropdownMenuItem
        onClick={() => column.pin(isPinned === "left" ? false : "left")}
      >
        <IconPlaceholder
          lucide="ArrowLeftToLineIcon"
          tabler="IconArrowBarToLeft"
          hugeicons="ArrowLeft03Icon"
          phosphor="ArrowLineLeftIcon"
          remixicon="RiContractLeftLine"
          className="size-3.5!"
          aria-hidden="true"
        />
        <span className="grow">Pin to left</span>
        {isPinned === "left" && (
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
            className="text-primary size-4 opacity-100!"
          />
        )}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => column.pin(isPinned === "right" ? false : "right")}
      >
        <IconPlaceholder
          lucide="ArrowRightToLineIcon"
          tabler="IconArrowBarToRight"
          hugeicons="ArrowRight03Icon"
          phosphor="ArrowLineRightIcon"
          remixicon="RiContractRightLine"
          className="size-3.5!"
          aria-hidden="true"
        />
        <span className="grow">Pin to right</span>
        {isPinned === "right" && (
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
            className="text-primary size-4 opacity-100!"
          />
        )}
      </DropdownMenuItem>
    </>
  );
}

interface MoveMenuItemsProps<TData, TValue> {
  column: Column<TData, TValue>;
  columnIndex: number;
  columnOrder: string[];
  table: Table<TData>;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  isPinned: "left" | "right" | false;
}

export function MoveMenuItems<TData, TValue>({
  column,
  columnIndex,
  columnOrder,
  table,
  canMoveLeft,
  canMoveRight,
  isPinned,
}: MoveMenuItemsProps<TData, TValue>) {
  return (
    <>
      <DropdownMenuItem
        onClick={() => {
          if (columnIndex > 0) {
            const newOrder = [...columnOrder];
            const [movedColumn] = newOrder.splice(columnIndex, 1);
            if (movedColumn) newOrder.splice(columnIndex - 1, 0, movedColumn);
            table.setColumnOrder(newOrder);
          }
        }}
        disabled={!canMoveLeft || isPinned !== false}
      >
        <IconPlaceholder
          lucide="ArrowLeftIcon"
          tabler="IconArrowLeft"
          hugeicons="ArrowLeft02Icon"
          phosphor="ArrowLeftIcon"
          remixicon="RiArrowLeftLine"
          className="size-3.5!"
          aria-hidden="true"
        />
        <span>Move to Left</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          if (columnIndex < columnOrder.length - 1) {
            const newOrder = [...columnOrder];
            const [movedColumn] = newOrder.splice(columnIndex, 1);
            if (movedColumn) newOrder.splice(columnIndex + 1, 0, movedColumn);
            table.setColumnOrder(newOrder);
          }
        }}
        disabled={!canMoveRight || isPinned !== false}
      >
        <IconPlaceholder
          lucide="ArrowRightIcon"
          tabler="IconArrowRight"
          hugeicons="ArrowRight02Icon"
          phosphor="ArrowRightIcon"
          remixicon="RiArrowRightLine"
          className="size-3.5!"
          aria-hidden="true"
        />
        <span>Move to Right</span>
      </DropdownMenuItem>
    </>
  );
}

interface VisibilityMenuItemsProps<TData> {
  table: Table<TData>;
  visibility: boolean;
}

export function VisibilityMenuItems<TData>({
  table,
  visibility,
}: VisibilityMenuItemsProps<TData>) {
  if (!visibility) return null;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <IconPlaceholder
          lucide="Settings2Icon"
          tabler="IconAdjustmentsHorizontal"
          hugeicons="SlidersHorizontalIcon"
          phosphor="SlidersHorizontalIcon"
          remixicon="RiEqualizer2Line"
          className="size-3.5!"
        />
        <span>Columns</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {table
          .getAllColumns()
          .filter(
            (col) =>
              typeof col.accessorFn !== "undefined" && col.getCanHide(),
          )
          .map((col) => (
            <DropdownMenuCheckboxItem
              key={col.id}
              checked={col.getIsVisible()}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(value) => col.toggleVisibility(!!value)}
              className="capitalize"
            >
              {col.columnDef.meta?.headerTitle || col.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function buildMenuItems<TData, TValue>(params: {
  filter: ReactNode;
  canSort: boolean;
  isSorted: false | "asc" | "desc";
  column: Column<TData, TValue>;
  columnsPinnable?: boolean;
  columnsMovable?: boolean;
  columnsVisibility?: boolean;
  canPin: boolean;
  isPinned: "left" | "right" | false;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  visibility: boolean;
  table: Table<TData>;
  columnIndex: number;
  columnOrder: string[];
}): ReactNode[] {
  const {
    filter,
    canSort,
    isSorted,
    column,
    columnsPinnable,
    columnsMovable,
    columnsVisibility,
    canPin,
    isPinned,
    canMoveLeft,
    canMoveRight,
    visibility,
    table,
    columnIndex,
    columnOrder,
  } = params;

  const items: ReactNode[] = [];
  let hasPreviousSection = false;

  if (filter) {
    items.push(
      <DropdownMenuGroup key="group-filter">
        <DropdownMenuLabel key="filter">{filter}</DropdownMenuLabel>
      </DropdownMenuGroup>,
    );
    hasPreviousSection = true;
  }

  if (canSort) {
    if (hasPreviousSection) items.push(<DropdownMenuSeparator key="sep-sort" />);
    items.push(
      <SortMenuItems
        key="sort"
        column={column}
        isSorted={isSorted}
        canSort={canSort}
      />,
    );
    hasPreviousSection = true;
  }

  if (columnsPinnable && canPin) {
    if (hasPreviousSection) items.push(<DropdownMenuSeparator key="sep-pin" />);
    items.push(
      <PinMenuItems
        key="pin"
        column={column}
        isPinned={isPinned}
        canPin={canPin}
      />,
    );
    hasPreviousSection = true;
  }

  if (columnsMovable) {
    if (hasPreviousSection) items.push(<DropdownMenuSeparator key="sep-move" />);
    items.push(
      <MoveMenuItems
        key="move"
        column={column}
        columnIndex={columnIndex}
        columnOrder={columnOrder}
        table={table}
        canMoveLeft={canMoveLeft}
        canMoveRight={canMoveRight}
        isPinned={isPinned}
      />,
    );
    hasPreviousSection = true;
  }

  if (columnsVisibility && visibility) {
    if (hasPreviousSection)
      items.push(<DropdownMenuSeparator key="sep-visibility" />);
    items.push(
      <VisibilityMenuItems key="visibility" table={table} visibility={true} />,
    );
  }

  return items;
}
