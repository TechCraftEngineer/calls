"use client"

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  type UniqueIdentifier,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core"
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers"
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Header } from "@tanstack/react-table"
import { useState, type CSSProperties, type ReactNode, useMemo } from "react"
import { useDataGrid } from "./data-grid"
import { cn } from "../../../lib/utils"

interface DataGridTableHeadRowCellDndProps<TData> {
  header: Header<TData, unknown>
  children: ReactNode
}

function DataGridTableHeadRowCellDnd<TData>({
  header,
  children,
}: DataGridTableHeadRowCellDndProps<TData>) {
  const { column } = header
  const columnId = column.id

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnId,
    disabled: column.getIsPinned() !== false,
  })

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  }

  const isPinned = column.getIsPinned() !== false

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "contents",
        !isPinned && "cursor-grab active:cursor-grabbing"
      )}
      title={!isPinned ? "Перетащите для изменения порядка колонок" : undefined}
    >
      {children}
    </div>
  )
}

interface DataGridTableDndContextProps<TData> {
  children: ReactNode
  headers: Header<TData, unknown>[]
}

function DataGridTableDndContext<TData>({
  children,
  headers,
}: DataGridTableDndContextProps<TData>) {
  const { table } = useDataGrid()

  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event) => {
        const { active, context } = event as unknown as {
          active: { id: UniqueIdentifier }
          context: {
            collisionRect: { left: number; top: number; width: number; height: number } | null
            droppableRects: Map<UniqueIdentifier, { left: number; top: number; width: number }>
          }
        }
        const { collisionRect, droppableRects } = context
        if (!collisionRect) return undefined

        const activeId = String(active.id)
        const activeIndex = headers.findIndex((h) => h.column.id === activeId)

        if (event.code === "ArrowRight") {
          const nextIndex = activeIndex + 1
          if (nextIndex < headers.length) {
            const nextId = headers[nextIndex]?.column.id
            if (!nextId) return undefined
            const nextRect = droppableRects.get(nextId)
            if (!nextRect) return undefined
            return {
              x: nextRect.left + collisionRect.width / 2,
              y: collisionRect.top + collisionRect.height / 2,
            }
          }
        }

        if (event.code === "ArrowLeft") {
          const prevIndex = activeIndex - 1
          if (prevIndex >= 0) {
            const prevId = headers[prevIndex]?.column.id
            if (!prevId) return undefined
            const prevRect = droppableRects.get(prevId)
            if (!prevRect) return undefined
            return {
              x: prevRect.left,
              y: collisionRect.top + collisionRect.height / 2,
            }
          }
        }

        return undefined
      },
    })
  )

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId !== overId) {
      const currentOrder = table.getState().columnOrder
      const oldIndex = currentOrder.indexOf(activeId)
      const newIndex = currentOrder.indexOf(overId)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = [...currentOrder]
        const [movedColumn] = newOrder.splice(oldIndex, 1)
        if (movedColumn) {
          newOrder.splice(newIndex, 0, movedColumn)
          table.setColumnOrder(newOrder)
        }
      }
    }
  }

  const sortableItems = useMemo(
    () => headers.map((h) => h.column.id),
    [headers]
  )

  const activeHeader = activeId
    ? headers.find((h) => h.column.id === activeId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortableItems}
        strategy={horizontalListSortingStrategy}
      >
        {children}
      </SortableContext>
      <DragOverlay>
        {activeHeader ? (
          <div className="bg-muted/90 border-border shadow-lg flex h-full items-center border px-3 text-sm font-medium opacity-90">
            {activeHeader.column.columnDef.header?.toString() || activeHeader.column.id}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export { DataGridTableHeadRowCellDnd, DataGridTableDndContext }
