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
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1.5 cursor-help">
          {content}
          <HelpCircle className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
