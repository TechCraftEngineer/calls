import { Card } from "@calls/ui";

interface SetupHeaderProps {
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
}

export function SetupHeader({ completedCount, totalSteps, progressPercent }: SetupHeaderProps) {
  return (
    <Card className="mb-0 overflow-hidden">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Завершите настройку</h2>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {completedCount} из {totalSteps} завершено
            </span>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
