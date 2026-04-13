import type { CSSProperties } from "react";
import type { Column } from "@tanstack/react-table";
import { cva } from "class-variance-authority";

export const headerCellSpacingVariants = cva("", {
  variants: {
    size: {
      dense: "px-2 h-8",
      default: "px-3",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export const bodyCellSpacingVariants = cva("", {
  variants: {
    size: {
      dense: "px-2 py-1.5",
      default: "px-3 py-2",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export function getPinningStyles<TData>(
  column: Column<TData>,
): CSSProperties {
  const isPinned = column.getIsPinned();

  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    position: isPinned ? "sticky" : "relative",
    width: column.getSize(),
    zIndex: isPinned ? 0 : undefined,
  };
}
