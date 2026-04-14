"use client";

import { Button } from "@calls/ui";

export default function DailyViewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Логируем полную информацию об ошибке для диагностики
  console.error("DailyViewError:", error);

  return (
    <main className="main-content">
      <header className="page-header mb-8">
        <h1 className="page-title">KPI по дням</h1>
        <p className="page-subtitle">Детализированная статистика по дням</p>
      </header>

      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Что-то пошло не так</h2>
          <p className="text-gray-600 mb-6">Произошла ошибка при загрузке данных KPI по дням</p>
          <Button onClick={reset} variant="default" aria-label="Попробовать снова">
            Попробовать снова
          </Button>
        </div>
      </div>
    </main>
  );
}
