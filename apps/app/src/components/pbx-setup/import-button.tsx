"use client";

import { Button } from "@calls/ui";
import { Check } from "lucide-react";

interface ImportButtonProps {
  selectedEmployeesCount: number;
  selectedNumbersCount: number;
  disabled: boolean;
  onImport: () => void;
}

export function ImportButton({
  selectedEmployeesCount,
  selectedNumbersCount,
  disabled,
  onImport,
}: ImportButtonProps) {
  return (
    <div className="flex justify-center">
      <Button
        size="lg"
        onClick={onImport}
        disabled={disabled}
        className="px-8"
      >
        <Check className="mr-2 size-4" />
        Импортировать выбранное ({selectedEmployeesCount} сотрудников,{" "}
        {selectedNumbersCount} номеров)
      </Button>
    </div>
  );
}
