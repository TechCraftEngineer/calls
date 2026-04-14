"use client";

import { Button, Card } from "@calls/ui";
import { Loader2, RefreshCw } from "lucide-react";

interface SyncCardProps {
  syncMutationPending: boolean;
  onSync: () => void;
}

export function SyncCard({ syncMutationPending, onSync }: SyncCardProps) {
  return (
    <Card className="mb-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <RefreshCw className="size-5 text-primary" />
            Загрузка данных
          </h2>
          <p className="text-sm text-muted-foreground">
            Синхронизируйте справочник сотрудников и номеров из АТС
          </p>
        </div>
        <Button onClick={onSync} disabled={syncMutationPending}>
          {syncMutationPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Синхронизировать и продолжить
        </Button>
      </div>
    </Card>
  );
}
