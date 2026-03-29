import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, toast } from "@calls/ui";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface BulkKpiSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: BulkKpiSettings) => Promise<void>;
  isLoading: boolean;
}

export interface BulkKpiSettings {
  baseSalary: number;
  targetBonus: number;
  targetTalkTimeMinutes: number;
}

const KPI_FIELD_LIMITS = {
  baseSalary: 999999,
  targetBonus: 999999,
  targetTalkTimeMinutes: 9999,
} as const;

export default function BulkKpiSettings({
  isOpen,
  onClose,
  onApply,
  isLoading,
}: BulkKpiSettingsProps) {
  const [settings, setSettings] = useState<BulkKpiSettings>({
    baseSalary: 0,
    targetBonus: 0,
    targetTalkTimeMinutes: 0,
  });

  const toNonNegativeInt = (value: number): number => {
    if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
    return Math.max(0, Math.trunc(value));
  };

  const handleFieldChange = (field: keyof BulkKpiSettings, value: string) => {
    const parsed = Number(value);
    const safeValue =
      value.trim() === "" || Number.isNaN(parsed)
        ? 0
        : Math.min(toNonNegativeInt(parsed), KPI_FIELD_LIMITS[field]);
    
    setSettings(prev => ({
      ...prev,
      [field]: safeValue,
    }));
  };

  const handleApply = async () => {
    try {
      await onApply(settings);
      toast.success("KPI применены ко всем сотрудникам");
      onClose();
      setSettings({ baseSalary: 0, targetBonus: 0, targetTalkTimeMinutes: 0 });
    } catch (error) {
      toast.error("Не удалось применить KPI");
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setSettings({ baseSalary: 0, targetBonus: 0, targetTalkTimeMinutes: 0 });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Массовое применение KPI</DialogTitle>
          <DialogDescription>
            Установите одинаковые KPI для всех сотрудников
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bulkBaseSalary" className="text-right">
              Базовая зарплата
            </Label>
            <Input
              id="bulkBaseSalary"
              type="number"
              value={settings.baseSalary || ""}
              onChange={(e) => handleFieldChange("baseSalary", e.target.value)}
              className="col-span-3"
              placeholder="0"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bulkTargetBonus" className="text-right">
              Целевой бонус
            </Label>
            <Input
              id="bulkTargetBonus"
              type="number"
              value={settings.targetBonus || ""}
              onChange={(e) => handleFieldChange("targetBonus", e.target.value)}
              className="col-span-3"
              placeholder="0"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bulkTargetTalkTimeMinutes" className="text-right">
              Целевое время разговора
            </Label>
            <Input
              id="bulkTargetTalkTimeMinutes"
              type="number"
              value={settings.targetTalkTimeMinutes || ""}
              onChange={(e) => handleFieldChange("targetTalkTimeMinutes", e.target.value)}
              className="col-span-3"
              placeholder="0"
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button type="button" onClick={handleApply} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Применить ко всем
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
