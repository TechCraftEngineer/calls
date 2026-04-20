"use client";

import { Card, CardContent } from "@calls/ui";

export function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-1.5 text-2xl font-bold tabular-nums">{value}</div>
        <div className="mt-0.5 text-xs text-muted-foreground/80">{hint}</div>
      </CardContent>
    </Card>
  );
}
