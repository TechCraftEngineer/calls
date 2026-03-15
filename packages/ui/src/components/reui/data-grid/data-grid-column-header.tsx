"use client";

import { HTMLAttributes, memo, ReactNode, useMemo } from "react";
import { useDataGrid } from "./data-grid";
import { Column } from "@tanstack/react-table";

import { cn } from "../../../lib/utils";
import { Button } from "../../button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../dropdown-menu";
import { IconPlaceholder } from "../../icon-placeholder";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";
import { buildMenuItems } from "./data-grid-column-header-menu";

interface DataGridColumnHeaderProps<
  TData,
  TValue,
> extends HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title?: string;
  icon?: ReactNode;
  tooltip?: string;
  pinnable?: boolean;
  filter?: ReactNode;
  visibility?: boolean;
}

function DataGridColumnHeaderInner<TData, TValue>({
  column,
  title = "",
  icon,
  tooltip,
  className,
  filter,
  visibility = false,
}: DataGridColumnHeaderProps<TData, TValue>) {
  const { isLoading, table, props, recordCount } = useDataGrid();

  const columnOrder = table.getState().columnOrder;
  const columnVisibilityKey = JSON.stringify(table.getState().columnVisibility);
  const isSorted = column.getIsSorted();
  const isPinned = column.getIsPinned();
  const canSort = column.getCanSort();
  const canPin = column.getCanPin();
  const canResize = column.getCanResize();

  const columnIndex = columnOrder.indexOf(column.id);
  const canMoveLeft = columnIndex > 0;
  const canMoveRight = columnIndex < columnOrder.length - 1;

  const handleSort = () => {
    if (isSorted === "asc") {
      column.toggleSorting(true);
    } else if (isSorted === "desc") {
      column.clearSorting();
    } else {
      column.toggleSorting(false);
    }
  };

  const headerLabelClassName = cn(
    "text-secondary-foreground/80 inline-flex h-full items-center gap-1.5 font-normal [&_svg]:opacity-60 text-[0.8125rem] leading-[calc(1.125/0.8125)] [&_svg]:size-3.5",
    className,
  );

  const headerButtonClassName = cn(
    "text-secondary-foreground/80 hover:bg-secondary data-[state=open]:bg-secondary hover:text-foreground data-[state=open]:text-foreground -ms-2 px-2 font-normal h-6 rounded-lg",
    className,
  );

  const sortIcon =
    canSort &&
    (isSorted === "desc" ? (
      <IconPlaceholder
        lucide="ArrowDownIcon"
        tabler="IconArrowDown"
        hugeicons="ArrowDown02Icon"
        phosphor="ArrowDownIcon"
        remixicon="RiArrowDownLine"
        className="size-3.25"
      />
    ) : isSorted === "asc" ? (
      <IconPlaceholder
        lucide="ArrowUpIcon"
        tabler="IconArrowUp"
        hugeicons="ArrowUp02Icon"
        phosphor="ArrowUpIcon"
        remixicon="RiArrowUpLine"
        className="size-3.25"
      />
    ) : (
      <IconPlaceholder
        lucide="ChevronsUpDownIcon"
        tabler="IconSelector"
        hugeicons="UnfoldMoreIcon"
        phosphor="CaretUpDownIcon"
        remixicon="RiExpandUpDownLine"
        className="mt-px size-3.25"
      />
    ));

  const hasControls =
    props.tableLayout?.columnsMovable ||
    (props.tableLayout?.columnsVisibility && visibility) ||
    (props.tableLayout?.columnsPinnable && canPin) ||
    filter;

  const infoIcon = tooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex shrink-0 cursor-help text-muted-foreground/70 hover:text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
          aria-label={tooltip}
        >
          <IconPlaceholder
            lucide="InfoIcon"
            tabler="IconInfoCircle"
            hugeicons="InfoCircleIcon"
            phosphor="InfoIcon"
            remixicon="RiInformationLine"
            className="size-3.5"
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  ) : null;

  const menuItems = useMemo(
    () =>
      buildMenuItems({
        filter,
        canSort,
        isSorted: isSorted ?? false,
        column,
        columnsPinnable: props.tableLayout?.columnsPinnable,
        columnsMovable: props.tableLayout?.columnsMovable,
        columnsVisibility: props.tableLayout?.columnsVisibility,
        canPin,
        isPinned: isPinned ?? false,
        canMoveLeft,
        canMoveRight,
        visibility,
        table,
        columnIndex,
        columnOrder,
      }),
    [
      filter,
      canSort,
      isSorted,
      column,
      props.tableLayout?.columnsPinnable,
      props.tableLayout?.columnsMovable,
      props.tableLayout?.columnsVisibility,
      canPin,
      isPinned,
      canMoveLeft,
      canMoveRight,
      visibility,
      table,
      columnIndex,
      columnOrder,
      columnVisibilityKey,
    ],
  );

  if (hasControls) {
    return (
      <div className="flex h-full items-center justify-between gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={headerButtonClassName}
              disabled={isLoading || recordCount === 0}
            >
              {icon && icon}
              {title}
              {infoIcon}
              {sortIcon}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" align="start">
            {menuItems}
          </DropdownMenuContent>
        </DropdownMenu>
        {props.tableLayout?.columnsPinnable && canPin && isPinned && (
          <Button
            size="icon-sm"
            variant="ghost"
            className="-me-1 size-7 rounded-md"
            onClick={() => column.pin(false)}
            aria-label={`Открепить колонку «${title}»`}
            title={`Открепить колонку «${title}»`}
          >
            <IconPlaceholder
              lucide="PinOffIcon"
              tabler="IconPinnedOff"
              hugeicons="PinOffIcon"
              phosphor="PushPinSlashIcon"
              remixicon="RiUnpinLine"
              className="size-3.5! opacity-50!"
              aria-hidden="true"
            />
          </Button>
        )}
      </div>
    );
  }

  if (canSort || (props.tableLayout?.columnsResizable && canResize)) {
    return (
      <div className="flex h-full items-center">
        <Button
          variant="ghost"
          className={headerButtonClassName}
          disabled={isLoading || recordCount === 0}
          onClick={handleSort}
        >
          {icon && icon}
          {title}
          {infoIcon}
          {sortIcon}
        </Button>
      </div>
    );
  }

  return (
    <div className={headerLabelClassName}>
      {icon && icon}
      {title}
      {infoIcon}
    </div>
  );
}

const DataGridColumnHeader = memo(
  DataGridColumnHeaderInner,
) as typeof DataGridColumnHeaderInner;

export { DataGridColumnHeader, type DataGridColumnHeaderProps };
