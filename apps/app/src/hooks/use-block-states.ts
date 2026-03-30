import { useCallback, useState } from "react";
import type { EditUserForm } from "@/components/features/users/types";

export type BlockState = "idle" | "saving" | "success" | "error";

export function useBlockStates() {
  const [changedBlocks, setChangedBlocks] = useState<Set<string>>(new Set());
  const [originalForm, setOriginalForm] = useState<EditUserForm | null>(null);
  const [blockStates, setBlockStates] = useState<Record<string, BlockState>>(
    {},
  );
  const [animatedBlocks, setAnimatedBlocks] = useState<Set<string>>(new Set());

  const getBlockFields = useCallback((blockName: string): string[] => {
    switch (blockName) {
      case "basic":
        return [
          "givenName",
          "familyName",
          "internalExtensions",
          "mobilePhones",
        ];
      case "telegram":
        return [
          "telegramDailyReport",
          "telegramManagerReport",
          "telegramWeeklyReport",
          "telegramMonthlyReport",
        ];
      case "max":
        return ["maxChatId", "maxDailyReport", "maxManagerReport"];
      case "email":
        return [
          "email",
          "emailDailyReport",
          "emailWeeklyReport",
          "emailMonthlyReport",
        ];
      case "reports":
        return [];
      case "kpi":
        return ["kpiBaseSalary", "kpiTargetBonus", "kpiTargetTalkTimeMinutes"];
      case "filters":
        return [
          "filterExcludeAnsweringMachine",
          "filterMinDuration",
          "filterMinReplicas",
        ];
      case "evaluation":
        return ["evaluationTemplateSlug", "evaluationCustomInstructions"];
      default:
        return [];
    }
  }, []);

  const checkBlockChanges = useCallback(
    (blockName: string, currentForm: EditUserForm): boolean => {
      if (!originalForm) return false;

      const blockFields = getBlockFields(blockName);
      return blockFields.some(
        (field) =>
          originalForm[field as keyof EditUserForm] !==
          currentForm[field as keyof EditUserForm],
      );
    },
    [originalForm, getBlockFields],
  );

  // Функции для отслеживания изменений в блоках
  const trackBlockChange = useCallback(
    (
      blockName: string,
      fieldName: string,
      _value: unknown,
      currentForm: EditUserForm,
    ) => {
      if (!originalForm) return;

      const originalValue = originalForm[fieldName as keyof EditUserForm];
      const currentValue = currentForm[fieldName as keyof EditUserForm];

      setChangedBlocks((prev) => {
        const newSet = new Set(prev);
        if (originalValue !== currentValue) {
          newSet.add(blockName);
        } else {
          // Проверим, есть ли другие изменения в этом блоке
          const hasOtherChanges = checkBlockChanges(blockName, currentForm);
          if (!hasOtherChanges) {
            newSet.delete(blockName);
          }
        }
        return newSet;
      });
    },
    [originalForm, checkBlockChanges],
  );

  const clearBlockChanges = useCallback((blockName: string) => {
    setChangedBlocks((prev) => {
      const newSet = new Set(prev);
      newSet.delete(blockName);
      return newSet;
    });
  }, []);

  // Функции для управления анимациями
  const setBlockState = useCallback((blockName: string, state: BlockState) => {
    setBlockStates((prev) => ({ ...prev, [blockName]: state }));

    // Добавляем анимацию для success/error состояний
    if (state === "success" || state === "error") {
      setAnimatedBlocks((prev) => new Set(prev).add(blockName));
      setTimeout(() => {
        setAnimatedBlocks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(blockName);
          return newSet;
        });
        setBlockStates((prev) => ({ ...prev, [blockName]: "idle" }));
      }, 2000);
    }
  }, []);

  const getBlockAnimationClass = useCallback(
    (blockName: string) => {
      if (!animatedBlocks.has(blockName)) return "";

      const state = blockStates[blockName];
      switch (state) {
        case "success":
          return "animate-pulse border-green-200 bg-green-50";
        case "error":
          return "animate-pulse border-red-200 bg-red-50";
        case "saving":
          return "opacity-75";
        default:
          return "";
      }
    },
    [animatedBlocks, blockStates],
  );

  const initializeForm = useCallback((form: EditUserForm) => {
    setOriginalForm(form);
    setChangedBlocks(new Set());
  }, []);

  const updateOriginalForm = useCallback((form: EditUserForm) => {
    setOriginalForm({ ...form });
  }, []);

  const hasBlockChanges = useCallback(
    (blockName: string, currentForm?: EditUserForm | null): boolean => {
      if (changedBlocks.has(blockName)) return true;
      if (!currentForm || !originalForm) return false;
      return checkBlockChanges(blockName, currentForm);
    },
    [changedBlocks, originalForm, checkBlockChanges],
  );

  return {
    changedBlocks,
    blockStates,
    trackBlockChange,
    clearBlockChanges,
    setBlockState,
    getBlockAnimationClass,
    initializeForm,
    updateOriginalForm,
    hasBlockChanges,
    getBlockState: (blockName: string) => blockStates[blockName] || "idle",
  };
}
