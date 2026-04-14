"use client";

import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Progress,
  toast,
} from "@calls/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfDay, subDays, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle2, Download, Loader2, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import type { ModalProps } from "@/components/features/setup";
import { useORPC } from "@/orpc/react";

type ImportStatus = "idle" | "importing" | "success" | "error";

interface ImportResult {
  totalCalls: number;
  importedCalls: number;
  skippedCalls: number;
  errors: number;
}

export function ImportModal({ open, onOpenChange, onComplete }: ModalProps<void>) {
  const orpc = useORPC();

  // Минимальная дата - месяц назад от сегодня
  const minDate = format(startOfDay(subMonths(new Date(), 1)), "yyyy-MM-dd");
  // Дата по умолчанию - 30 дней назад
  const defaultDate = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const [importFromDate, setImportFromDate] = useState(defaultDate);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Проверяем наличие подключения к PBX
  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    ...orpc.settings.getIntegrations.queryOptions(),
    enabled: open,
  });

  const hasPbxConnection = integrations?.megapbx?.enabled === true;

  // Мутация для импорта звонков
  const importCallsMutation = useMutation(
    orpc.calls.importHistoricalCalls.mutationOptions({
      onSuccess: (data) => {
        setStatus("success");
        setProgress(100);
        setResult({
          totalCalls: data.total ?? 0,
          importedCalls: data.imported ?? 0,
          skippedCalls: data.skipped ?? 0,
          errors: data.errors ?? 0,
        });
        toast.success("Импорт завершён успешно");
      },
      onError: (error) => {
        setStatus("error");
        toast.error(error.message || "Ошибка импорта звонков");
      },
    }),
  );

  // Удалена симуляция прогресса - теперь импорт синхронный

  const handleStartImport = async () => {
    if (!hasPbxConnection) {
      toast.error("Сначала подключите API телефонии");
      return;
    }

    setStatus("importing");
    setProgress(0);
    setResult(null);

    try {
      await importCallsMutation.mutateAsync({
        fromDate: importFromDate,
      });
    } catch {
      // Error handled in mutation
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleComplete = () => {
    onComplete();
  };

  // Сброс при закрытии
  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setProgress(0);
      setResult(null);
      setImportFromDate(defaultDate);
    }
  }, [open, defaultDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Импорт истории звонков</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Loading state while checking integrations */}
          {integrationsLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Статус подключения */}
          {!integrationsLoading && integrations && !hasPbxConnection && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-500" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  API телефонии не подключено
                </p>
                <p className="mt-1 text-amber-700 dark:text-amber-300">
                  Сначала настройте подключение к API на предыдущем шаге
                </p>
              </div>
            </div>
          )}

          {!integrationsLoading && status === "idle" && (
            <>
              {/* Выбор даты */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="size-4 text-primary" />
                  <span>С какой даты импортировать звонки?</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Можно импортировать звонки только за последний месяц. Рекомендуем начать с
                  последних 30 дней.
                </p>
                <DatePicker
                  value={importFromDate}
                  onChange={setImportFromDate}
                  placeholder="Выберите дату"
                  disabled={!hasPbxConnection}
                  className="w-full"
                  minDate={minDate}
                />
              </div>

              {/* Информационная карточка */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Phone className="size-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Что будет импортировано?</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>• Записи всех звонков с выбранной даты</li>
                      <li>• Информация о длительности и статусе</li>
                      <li>• Связь с сотрудниками и клиентами</li>
                      <li>• Аудиозаписи разговоров (если доступны)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex gap-2">
                <Button
                  onClick={handleStartImport}
                  disabled={!hasPbxConnection || !importFromDate}
                  className="flex-1"
                >
                  <Download className="mr-2 size-4" />
                  Начать импорт
                </Button>
                <Button variant="outline" onClick={handleSkip} className="flex-1">
                  Пропустить
                </Button>
              </div>
            </>
          )}

          {status === "importing" && (
            <>
              {/* Прогресс импорта */}
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                    <Loader2 className="size-8 animate-spin text-primary" />
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <p className="font-medium">Импортируем звонки...</p>
                  <p className="text-sm text-muted-foreground">
                    Это может занять несколько минут в зависимости от объёма данных
                  </p>
                </div>
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-center text-xs text-muted-foreground">
                    {Math.round(progress)}%
                  </p>
                </div>
              </div>
            </>
          )}

          {status === "success" && result && (
            <>
              {/* Результат импорта */}
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <p className="font-medium">Импорт завершён успешно!</p>
                  <p className="text-sm text-muted-foreground">
                    Звонки с {format(parseISO(importFromDate), "d MMMM yyyy", { locale: ru })}{" "}
                    загружены
                  </p>
                </div>

                {/* Статистика */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-2xl font-semibold text-foreground">{result.importedCalls}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Импортировано</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-2xl font-semibold text-foreground">{result.totalCalls}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Всего звонков</p>
                  </div>
                  {result.skippedCalls > 0 && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-center">
                      <p className="text-2xl font-semibold text-muted-foreground">
                        {result.skippedCalls}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Пропущено</p>
                    </div>
                  )}
                  {result.errors > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center dark:border-red-900/50 dark:bg-red-900/20">
                      <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                        {result.errors}
                      </p>
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">Ошибок</p>
                    </div>
                  )}
                </div>

                <Button onClick={handleComplete} className="w-full">
                  Продолжить настройку
                </Button>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              {/* Ошибка импорта */}
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertCircle className="size-8 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <p className="font-medium">Ошибка импорта</p>
                  <p className="text-sm text-muted-foreground">
                    Не удалось импортировать звонки. Проверьте подключение к API и попробуйте снова.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setStatus("idle");
                      setProgress(0);
                      setResult(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Попробовать снова
                  </Button>
                  <Button onClick={handleSkip} className="flex-1">
                    Пропустить
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
