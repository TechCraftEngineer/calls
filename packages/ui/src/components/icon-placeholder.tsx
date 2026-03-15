"use client";

import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Map ReUI lucide prop names (Icon suffix) to lucide-react exports
const LUCIDE_MAP: Record<string, LucideIcon> = {
  ArrowDownIcon: LucideIcons.ArrowDown,
  ArrowUpIcon: LucideIcons.ArrowUp,
  ChevronsUpDownIcon: LucideIcons.ChevronsUpDown,
  CheckIcon: LucideIcons.Check,
  ArrowLeftToLineIcon: LucideIcons.ArrowLeftToLine,
  ArrowRightToLineIcon: LucideIcons.ArrowRightToLine,
  ArrowLeftIcon: LucideIcons.ArrowLeft,
  ArrowRightIcon: LucideIcons.ArrowRight,
  Settings2Icon: LucideIcons.Settings2,
  PinOffIcon: LucideIcons.PinOff,
  ChevronLeftIcon: LucideIcons.ChevronLeft,
  ChevronRightIcon: LucideIcons.ChevronRight,
  GripVerticalIcon: LucideIcons.GripVertical,
  ChevronDownIcon: LucideIcons.ChevronDown,
  FilterIcon: LucideIcons.Filter,
};

interface IconPlaceholderProps extends React.SVGAttributes<SVGSVGElement> {
  lucide?: keyof typeof LUCIDE_MAP;
  tabler?: string;
  hugeicons?: string;
  phosphor?: string;
  remixicon?: string;
}

export function IconPlaceholder({
  lucide,
  className,
  ...props
}: IconPlaceholderProps) {
  const Icon = lucide ? LUCIDE_MAP[lucide] : null;
  if (Icon) {
    return <Icon className={className} {...props} />;
  }
  return <span className={className} data-slot="icon-placeholder" />;
}
