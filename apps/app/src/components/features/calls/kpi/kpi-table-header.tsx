import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@calls/ui";
import { HelpCircle } from "lucide-react";

interface KpiTableHeaderProps {
  label: string;
  tooltip?: string;
}

export function KpiTableHeader({ label, tooltip }: KpiTableHeaderProps) {
  if (!tooltip) {
    return <span>{label}</span>;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5 cursor-help">
            <span>{label}</span>
            <HelpCircle className="size-3.5 text-muted-foreground" aria-hidden />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
