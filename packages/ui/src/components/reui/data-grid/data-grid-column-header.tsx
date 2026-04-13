"use client"

import { HTMLAttributes, memo, ReactNode } from "react"
import {
  getColumnHeaderLabel,
  useDataGrid,
} from "./data-grid"
import { Column, Table } from "@tanstack/react-table"

import { cn } from "../.."
import { Button } from "../../"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../.."
import { IconPlaceholder } from "../.."

// Menu section components extracted from useMemo for better maintainability

function FilterMenuSection({ filter }: { filter: ReactNode }) {
  return (
    <DropdownMenuGroup key="group-filter">
      <DropdownMenuLabel key="filter">{filter}</DropdownMenuLabel>
    </DropdownMenuGroup>
  )
}

function SortMenuSection<TData, TValue>({
  column,
  canSort,
  isSorted,
}: {
  column: Column<TData, TValue>
  canSort: boolean
  isSorted: false | "asc" | "desc"
}) {
  if (!canSort) return null
  return (
    <>
      <DropdownMenuSeparator key="sep-sort" />
      <DropdownMenuItem
        key="sort-asc"
        onClick={() => {
          if (isSorted === "asc") {
            column.clearSorting()
          } else {
            column.toggleSorting(false)
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
        <span className="grow">По возрастанию</span>
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
        key="sort-desc"
        onClick={() => {
          if (isSorted === "desc") {
            column.clearSorting()
          } else {
            column.toggleSorting(true)
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
        <span className="grow">По убыванию</span>
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
  )
}

function PinMenuSection<TData, TValue>({
  column,
  canPin,
  isPinned,
}: {
  column: Column<TData, TValue>
  canPin: boolean
  isPinned: false | "left" | "right"
}) {
  if (!canPin) return null
  return (
    <>
      <DropdownMenuSeparator key="sep-pin" />
      <DropdownMenuItem
        key="pin-left"
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
        <span className="grow">Закрепить слева</span>
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
        key="pin-right"
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
        <span className="grow">Закрепить справа</span>
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
  )
}

function MoveMenuSection<TData, TValue>({
  column,
  table,
  columnOrder,
  columnIndex,
  canMoveLeft,
  canMoveRight,
  isPinned,
}: {
  column: Column<TData, TValue>
  table: Table<TData>
  columnOrder: string[]
  columnIndex: number
  canMoveLeft: boolean
  canMoveRight: boolean
  isPinned: false | "left" | "right"
}) {
  return (
    <>
      <DropdownMenuSeparator key="sep-move" />
      <DropdownMenuItem
        key="move-left"
        onClick={() => {
          if (columnIndex > 0) {
            const newOrder = [...columnOrder]
            const [movedColumn] = newOrder.splice(columnIndex, 1)
            if (movedColumn) {
              newOrder.splice(columnIndex - 1, 0, movedColumn)
            }
            table.setColumnOrder(newOrder)
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
        <span>Переместить влево</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        key="move-right"
        onClick={() => {
          if (columnIndex < columnOrder.length - 1) {
            const newOrder = [...columnOrder]
            const [movedColumn] = newOrder.splice(columnIndex, 1)
            if (movedColumn) {
              newOrder.splice(columnIndex + 1, 0, movedColumn)
              table.setColumnOrder(newOrder)
            }
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
        <span>Переместить вправо</span>
      </DropdownMenuItem>
    </>
  )
}

function VisibilityMenuSection<TData>({
  table,
  visibility,
}: {
  table: Table<TData>
  visibility: boolean
}) {
  if (!visibility) return null
  return (
    <>
      <DropdownMenuSeparator key="sep-visibility" />
      <DropdownMenuSub key="visibility">
        <DropdownMenuSubTrigger>
          <IconPlaceholder
            lucide="Settings2Icon"
            tabler="IconAdjustmentsHorizontal"
            hugeicons="SlidersHorizontalIcon"
            phosphor="SlidersHorizontalIcon"
            remixicon="RiEqualizer2Line"
            className="size-3.5!"
          />
          <span>Колонки</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {table
            .getAllColumns()
            .filter((col) => col.getCanHide())
            .map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={col.getIsVisible()}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(value) => col.toggleVisibility(!!value)}
                className="capitalize"
              >
                {getColumnHeaderLabel(col)}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  )
}

interface DataGridColumnHeaderProps<
  TData,
  TValue,
> extends HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  /** When omitted, uses `column.columnDef.meta.headerTitle`, then a string `columnDef.header`, then `column.id`. */
  title?: string
  icon?: ReactNode
  pinnable?: boolean
  filter?: ReactNode
  visibility?: boolean
}

function DataGridColumnHeaderInner<TData, TValue>({
  column,
  title,
  icon,
  className,
  filter,
  visibility = false,
}: DataGridColumnHeaderProps<TData, TValue>) {
  const { isLoading, table, props, recordCount } = useDataGrid()
  const resolvedTitle = title ?? getColumnHeaderLabel(column)

  const columnOrder = table.getState().columnOrder
  const columnVisibilityKey = JSON.stringify(table.getState().columnVisibility)
  const isSorted = column.getIsSorted()
  const isPinned = column.getIsPinned()
  const canSort = column.getCanSort()
  const canPin = column.getCanPin()
  const canResize = column.getCanResize()

  const columnIndex = columnOrder.indexOf(column.id)
  const canMoveLeft = columnIndex > 0
  const canMoveRight = columnIndex < columnOrder.length - 1

  const handleSort = () => {
    if (isSorted === "asc") {
      column.toggleSorting(true)
    } else if (isSorted === "desc") {
      column.clearSorting()
    } else {
      column.toggleSorting(false)
    }
  }

  const headerLabelClassName = cn(
    "text-secondary-foreground/80 inline-flex h-full items-center gap-1.5 font-normal [&_svg]:opacity-60 style-vega:text-[0.8125rem] style-vega:leading-[calc(1.125/0.8125)] style-vega:[&_svg]:size-3.5 style-maia:text-[0.8125rem] style-maia:leading-[calc(1.125/0.8125)] style-maia:[&_svg]:size-3.5 style-nova:text-[0.8125rem] style-nova:leading-[calc(1.125/0.8125)] style-nova:[&_svg]:size-3.5 style-lyra:text-xs style-lyra:[&_svg]:size-3 style-mira:text-xs/relaxed style-mira:[&_svg]:size-3",
    className
  )

  const headerButtonClassName = cn(
    "text-secondary-foreground/80 hover:bg-secondary data-[state=open]:bg-secondary hover:text-foreground data-[state=open]:text-foreground -ms-2 px-2 font-normal style-vega:h-7 style-vega:rounded-md style-maia:h-7 style-maia:rounded-4xl style-nova:h-6 style-nova:rounded-lg style-lyra:h-6 style-lyra:rounded-none style-mira:h-6 style-mira:rounded-md",
    className
  )

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
    ))

  const hasControls =
    props.tableLayout?.columnsMovable ||
    (props.tableLayout?.columnsVisibility && visibility) ||
    (props.tableLayout?.columnsPinnable && canPin) ||
    filter

  // Build menu items using extracted section components for better maintainability
  const menuItems = (
    <>
      {filter && <FilterMenuSection filter={filter} />}
      <SortMenuSection column={column} canSort={canSort} isSorted={isSorted} />
      <PinMenuSection column={column} canPin={canPin} isPinned={isPinned} />
      {props.tableLayout?.columnsMovable && (
        <MoveMenuSection
          column={column}
          table={table}
          columnOrder={columnOrder}
          columnIndex={columnIndex}
          canMoveLeft={canMoveLeft}
          canMoveRight={canMoveRight}
          isPinned={isPinned}
        />
      )}
      {props.tableLayout?.columnsVisibility && visibility && (
        <VisibilityMenuSection table={table} visibility={visibility} />
      )}
    </>
  )

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
              {resolvedTitle}
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
            aria-label={`Открепить колонку ${resolvedTitle}`}
            title={`Открепить колонку ${resolvedTitle}`}
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
    )
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
          {resolvedTitle}
          {sortIcon}
        </Button>
      </div>
    )
  }

  return (
    <div className={headerLabelClassName}>
      {icon && icon}
      {resolvedTitle}
    </div>
  )
}

const DataGridColumnHeader = memo(
  DataGridColumnHeaderInner
) as typeof DataGridColumnHeaderInner

export { DataGridColumnHeader, type DataGridColumnHeaderProps }
