"use client";

import { Button, Card, CardContent, CardHeader } from "@calls/ui";
import type { BackupSectionProps } from "../types/settings";

export default function BackupSection({
  backupLoading,
  onBackup,
}: BackupSectionProps) {
  return (
    <Card className="card mb-6">
      <CardHeader className="p-0 pb-0">
        <div className="section-title mb-4 flex items-center gap-2">
          <span className="text-base">💾</span> Резервная копия базы
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-0">
        <p className="text-[13px] text-[#666] mb-4">
          Создать копию базы данных и сохранить её на сервере.
        </p>
        <Button
          type="button"
          onClick={onBackup}
          disabled={backupLoading}
          className={
            backupLoading
              ? "bg-[#CCC] text-white border-none rounded-lg py-3 px-6 text-sm font-semibold cursor-not-allowed"
              : "bg-gradient-to-br from-[#2d7d46] to-[#1e5c34] text-white border-none rounded-lg py-3 px-6 text-sm font-semibold"
          }
        >
          {backupLoading ? "Создание копии…" : "Копия базы"}
        </Button>
      </CardContent>
    </Card>
  );
}
