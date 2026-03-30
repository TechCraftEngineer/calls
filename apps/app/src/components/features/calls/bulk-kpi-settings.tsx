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
import { useState, useRef } from "react";

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

export interface BulkKpiFieldErrors {
  baseSalary?: string;
  targetBonus?: string;
  targetTalkTimeMinutes?: string;
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

  const [fieldErrors, setFieldErrors] = useState<BulkKpiFieldErrors>({});

  const baseSalaryRef = useRef<HTMLInputElement>(null);
  const targetBonusRef = useRef<HTMLInputElement>(null);
  const targetTalkTimeMinutesRef = useRef<HTMLInputElement>(null);

  const toNonNegativeInt = (value: number): number => {
    if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
    return Math.max(0, Math.trunc(value));
  };

  const handleFieldChange = (field: keyof BulkKpiSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
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
        fieldName: keyof BulkKpiSettings,
        fieldLabel: string,
      ): { value: number; error?: string } => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          return {
            value: 0,
            error: `Поле "${fieldLabel}" должно содержать корректное число`,
          };
        }
        return { value: toNonNegativeInt(parsed) };
      };

      const baseSalaryResult = validateNumericField(
        settings.baseSalary,
        "baseSalary",
        "Базовая зарплата",
      );
      const targetBonusResult = validateNumericField(
        settings.targetBonus,
        "targetBonus",
        "Целевой бонус",
      );
      const targetTalkTimeMinutesResult = validateNumericField(
        settings.targetTalkTimeMinutes,
        "targetTalkTimeMinutes",
        "Целевое время разговора",
      );

      // Map errors to fields
      const newFieldErrors: BulkKpiFieldErrors = {
        baseSalary: baseSalaryResult.error,
        targetBonus: targetBonusResult.error,
        targetTalkTimeMinutes: targetTalkTimeMinutesResult.error,
      };

      // Filter out undefined errors
      const errors = Object.values(newFieldErrors).filter(Boolean);

      if (errors.length > 0) {
        setFieldErrors(newFieldErrors);

        // Focus on first field with error
        if (newFieldErrors.baseSalary) {
          baseSalaryRef.current?.focus();
        } else if (newFieldErrors.targetBonus) {
          targetBonusRef.current?.focus();
        } else if (newFieldErrors.targetTalkTimeMinutes) {
          targetTalkTimeMinutesRef.current?.focus();
        }

        // Show summary toast instead of first error
        toast.error("Исправьте ошибки в форме");
        return;
      }

      const validatedSettings = {
        baseSalary: Math.min(
          baseSalaryResult.value,
          KPI_FIELD_LIMITS.baseSalary,
        ),
        targetBonus: Math.min(
          targetBonusResult.value,
          KPI_FIELD_LIMITS.targetBonus,
        ),
        targetTalkTimeMinutes: Math.min(
          targetTalkTimeMinutesResult.value,
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
      setFieldErrors({});
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
      setFieldErrors({});
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
            <div className="col-span-3">
              <Input
                ref={baseSalaryRef}
                id="bulkBaseSalary"
                type="number"
                name="bulkBaseSalary"
                inputMode="numeric"
                autoComplete="off"
                value={settings.baseSalary || ""}
                onChange={(e) =>
                  handleFieldChange("baseSalary", e.target.value)
                }
                placeholder="0"
                disabled={isLoading}
                aria-invalid={!!fieldErrors.baseSalary}
                aria-describedby={
                  fieldErrors.baseSalary ? "baseSalary-error" : undefined
                }
              />
              {fieldErrors.baseSalary && (
                <p
                  id="baseSalary-error"
                  className="text-sm text-destructive mt-1"
                >
                  {fieldErrors.baseSalary}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="bulkTargetBonus" className="text-right mt-2">
              Целевой бонус
            </Label>
            <div className="col-span-3">
              <Input
                ref={targetBonusRef}
                id="bulkTargetBonus"
                type="number"
                name="bulkTargetBonus"
                inputMode="numeric"
                autoComplete="off"
                value={settings.targetBonus || ""}
                onChange={(e) =>
                  handleFieldChange("targetBonus", e.target.value)
                }
                placeholder="0"
                disabled={isLoading}
                aria-invalid={!!fieldErrors.targetBonus}
                aria-describedby={
                  fieldErrors.targetBonus ? "targetBonus-error" : undefined
                }
              />
              {fieldErrors.targetBonus && (
                <p
                  id="targetBonus-error"
                  className="text-sm text-destructive mt-1"
                >
                  {fieldErrors.targetBonus}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label
              htmlFor="bulkTargetTalkTimeMinutes"
              className="text-right mt-2"
            >
              Целевое время разговора
            </Label>
            <div className="col-span-3">
              <Input
                ref={targetTalkTimeMinutesRef}
                id="bulkTargetTalkTimeMinutes"
                type="number"
                name="bulkTargetTalkTimeMinutes"
                inputMode="numeric"
                autoComplete="off"
                value={settings.targetTalkTimeMinutes || ""}
                onChange={(e) =>
                  handleFieldChange("targetTalkTimeMinutes", e.target.value)
                }
                placeholder="0"
                disabled={isLoading}
                aria-invalid={!!fieldErrors.targetTalkTimeMinutes}
                aria-describedby={
                  fieldErrors.targetTalkTimeMinutes
                    ? "targetTalkTimeMinutes-error"
                    : undefined
                }
              />
              {fieldErrors.targetTalkTimeMinutes && (
                <p
                  id="targetTalkTimeMinutes-error"
                  className="text-sm text-destructive mt-1"
                >
                  {fieldErrors.targetTalkTimeMinutes}
                </p>
              )}
            </div>
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
