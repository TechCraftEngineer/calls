"use client";

import type { DailyKpiRow } from "@calls/shared";
import { Button, toast } from "@calls/ui";
import { Download, Loader2 } from "lucide-react";
import * as React from "react";
import { generateCSV, generateCSVFileName } from "@/lib/csv-export";

interface ExportButtonProps {
  data: DailyKpiRow[];
  employeeName: string;
  startDate: string;
  endDate: string;
}

export function ExportButton({ data, employeeName, startDate, endDate }: ExportButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleExport = React.useCallback(async () => {
    try {
      setIsLoading(true);

      // Проверка на пустые данные
      if (!data || data.length === 0) {
        toast.error("Нет данных для экспорта");
        return;
      }

      // Генерируем CSV контент
      const csvContent = generateCSV(data);

      // Генерируем имя файла
      const fileName = generateCSVFileName(employeeName, startDate, endDate);

      // Создаем blob и скачиваем
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();

      // Очищаем URL
      URL.revokeObjectURL(url);

      toast.success("CSV файл успешно экспортирован");
    } catch (error) {
      console.error("Ошибка при экспорте CSV:", error);
      toast.error(error instanceof Error ? error.message : "Ошибка при генерации CSV файла");
    } finally {
      setIsLoading(false);
    }
  }, [data, employeeName, startDate, endDate]);

  return (
    <Button
      onClick={handleExport}
      disabled={isLoading || !data || data.length === 0}
      variant="outline"
      size="sm"
      aria-label="Экспортировать данные в CSV"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Экспорт в CSV…
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Экспорт в CSV
        </>
      )}
    </Button>
  );
}
