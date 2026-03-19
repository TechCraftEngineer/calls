"use client";

import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@calls/ui";
import { QUICK_ACTIONS } from "../constants";
import { SectionBlock } from "../section-block";

type SyncingKey = "directory" | "calls";

interface QuickActionsSectionProps {
  syncing: SyncingKey | null;
  onSyncDirectory: () => Promise<void>;
  onSyncCalls: () => Promise<void>;
}

export function QuickActionsSection({
  syncing,
  onSyncDirectory,
  onSyncCalls,
}: QuickActionsSectionProps) {
  const handlers: Record<SyncingKey, () => Promise<void>> = {
    directory: onSyncDirectory,
    calls: onSyncCalls,
  };

  return (
    <SectionBlock
      title="Быстрые действия"
      description="Сохраните настройки, затем при необходимости вручную запустите синхронизацию."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map(([key, title, description, Icon]) => (
          <Card
            key={key}
            className="gap-4 py-4 transition-colors hover:border-border hover:bg-muted/30"
          >
            <CardHeader className="flex flex-col gap-2 px-4 pb-0">
              <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="px-4 pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={handlers[key]}
                disabled={syncing !== null}
                className="w-full transition-transform duration-150 active:scale-[0.98]"
                aria-label={
                  syncing === key
                    ? `Синхронизация ${title}…`
                    : `Синхронизировать ${title}`
                }
              >
                {syncing === key ? "Синк…" : "Запустить"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </SectionBlock>
  );
}
