"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@calls/ui";
import { Loader2 } from "lucide-react";
import { QUICK_ACTIONS } from "../constants";

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
    <Card>
      <CardHeader>
        <CardTitle>Быстрые действия</CardTitle>
        <CardDescription>Запустите синхронизацию вручную при необходимости</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {QUICK_ACTIONS.map(([key, title, description, Icon]) => (
            <div
              key={key}
              className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-semibold">{title}</div>
                  <div className="text-sm text-muted-foreground">{description}</div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlers[key]}
                disabled={syncing !== null}
                className="w-full"
                aria-label={
                  syncing === key ? `Синхронизация ${title}…` : `Синхронизировать ${title}`
                }
              >
                {syncing === key && <Loader2 className="size-4 animate-spin mr-2" aria-hidden />}
                Запустить
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
