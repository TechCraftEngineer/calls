"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@calls/ui";
import { Loader2 } from "lucide-react";
import type { KpiRow } from "./kpi-table-types";
import { KPI_FIELD_LIMITS } from "./kpi-table-types";

interface KpiEditDialogProps {
  row: KpiRow;
  draft: Partial<KpiRow>;
  isOpen: boolean;
  isLoading: boolean;
  onSave: () => void;
  onCancel: () => void;
  onFieldChange: (field: keyof KpiRow, value: string) => void;
}

export default function KpiEditDialog({
  row,
  draft,
  isOpen,
  isLoading,
  onSave,
  onCancel,
  onFieldChange,
}: KpiEditDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактирование KPI</DialogTitle>
          <DialogDescription>
            Настройте KPI для сотрудника: {row.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="baseSalary" className="text-right">
              Оклад, ₽
            </Label>
            <Input
              id="baseSalary"
              type="number"
              value={draft.baseSalary ?? ""}
              onChange={(e) => onFieldChange("baseSalary", e.target.value)}
              className="col-span-3"
              max={KPI_FIELD_LIMITS.baseSalary}
              min="0"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="targetBonus" className="text-right">
              Бонус, ₽
            </Label>
            <Input
              id="targetBonus"
              type="number"
              value={draft.targetBonus ?? ""}
              onChange={(e) => onFieldChange("targetBonus", e.target.value)}
              className="col-span-3"
              max={KPI_FIELD_LIMITS.targetBonus}
              min="0"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="targetTalkTimeMinutes" className="text-right">
              Цель, мин/мес
            </Label>
            <Input
              id="targetTalkTimeMinutes"
              type="number"
              value={draft.targetTalkTimeMinutes ?? ""}
              onChange={(e) =>
                onFieldChange("targetTalkTimeMinutes", e.target.value)
              }
              className="col-span-3"
              max={KPI_FIELD_LIMITS.targetTalkTimeMinutes}
              min="0"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Отмена
          </Button>
          <Button onClick={onSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
