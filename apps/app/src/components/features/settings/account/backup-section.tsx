"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@calls/ui";
import type { BackupSectionProps } from "../types";

export default function BackupSection({ backupLoading, onBackup }: BackupSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10">
            💾
          </span>
          Резервная копия базы
        </CardTitle>
        <CardDescription>Создать копию базы данных и сохранить её на сервере.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={onBackup} disabled={backupLoading} variant="default">
          {backupLoading ? "Создание копии…" : "Создать копию базы"}
        </Button>
      </CardContent>
    </Card>
  );
}
