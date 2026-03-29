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
  toast,
} from "@calls/ui";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface BulkKpiSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: {
    baseSalary: number;
    targetBonus: number;
    targetTalkTimeMinutes: number;
  }) => Promise<void>;
  isLoading: boolean;
}

export interface BulkKpiSettings {
  baseSalary: string;
  targetBonus: string;
  targetTalkTimeMinutes: string;
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
    baseSalary: "",
    targetBonus: "",
    targetTalkTimeMinutes: "",
  });

  const toNonNegativeInt = (value: number): number => {
    if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
    return Math.max(0, Math.trunc(value));
  };

  const handleFieldChange = (field: keyof BulkKpiSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApply = async () => {
    try {
      // Проверка на пустые значения
      if (
        settings.baseSalary.trim() === "" ||
        settings.targetBonus.trim() === "" ||
        settings.targetTalkTimeMinutes.trim() === ""
      ) {
        toast.error("Все поля должны быть заполнены");
        return;
      }

      // Валидация и преобразование строк в числа с ограничениями
      const validateNumericField = (
        value: string,
        fieldName: string,
      ): number | null => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          toast.error(`Поле "${fieldName}" должно содержать корректное число`);
          return null;
        }
        return toNonNegativeInt(parsed);
      };

      const baseSalaryNum = validateNumericField(
        settings.baseSalary,
        "Базовая зарплата",
      );
      const targetBonusNum = validateNumericField(
        settings.targetBonus,
        "Целевой бонус",
      );
      const targetTalkTimeMinutesNum = validateNumericField(
        settings.targetTalkTimeMinutes,
        "Целевое время разговора",
      );

      if (
        baseSalaryNum === null ||
        targetBonusNum === null ||
        targetTalkTimeMinutesNum === null
      ) {
        return;
      }

      const validatedSettings = {
        baseSalary: Math.min(baseSalaryNum, KPI_FIELD_LIMITS.baseSalary),
        targetBonus: Math.min(targetBonusNum, KPI_FIELD_LIMITS.targetBonus),
        targetTalkTimeMinutes: Math.min(
          targetTalkTimeMinutesNum,
          KPI_FIELD_LIMITS.targetTalkTimeMinutes,
        ),
      };

      await onApply(validatedSettings);
      toast.success("KPI применены ко всем сотрудникам");
      onClose();
      setSettings({
        baseSalary: "",
        targetBonus: "",
        targetTalkTimeMinutes: "",
      });
    } catch (error) {
      console.error("Failed to apply KPI", error);
      toast.error("Не удалось применить KPI");
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setSettings({
        baseSalary: "",
        targetBonus: "",
        targetTalkTimeMinutes: "",
      });
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
              name="bulkBaseSalary"
              inputMode="numeric"
              autoComplete="off"
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
              name="bulkTargetBonus"
              inputMode="numeric"
              autoComplete="off"
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
              name="bulkTargetTalkTimeMinutes"
              inputMode="numeric"
              autoComplete="off"
              value={settings.targetTalkTimeMinutes || ""}
              onChange={(e) =>
                handleFieldChange("targetTalkTimeMinutes", e.target.value)
              }
              className="col-span-3"
              placeholder="0"
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
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
