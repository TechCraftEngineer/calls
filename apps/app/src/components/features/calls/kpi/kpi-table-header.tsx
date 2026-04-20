import { Tooltip, TooltipContent, TooltipTrigger } from "@calls/ui";
import { HelpCircle } from "lucide-react";
import type React from "react";

interface KpiTableHeaderProps {
  label?: string;
  tooltip?: string;
  children?: React.ReactNode;
}

export function KpiTableHeader({ label, tooltip, children }: KpiTableHeaderProps) {
  const content = children ?? <span>{label}</span>;

  if (!tooltip) {
    return content;
  }

  return (
    <Tooltip>
      <div className="inline-flex items-center gap-1.5">
        {content}
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-action-manipulation"
            aria-label="Показать информацию о KPI"
          >
            <HelpCircle className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </button>
        </TooltipTrigger>
      </div>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
