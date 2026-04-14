import { Card, CardContent, Skeleton } from "@calls/ui";

export default function DailyViewLoading() {
  return (
    <main className="main-content" aria-busy="true">
      <span className="sr-only" role="status">
        Загрузка данных...
      </span>
      <header className="page-header mb-8">
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-80" />
      </header>

      <div className="space-y-6">
        {/* Кнопка "Назад" */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
        </div>

        {/* Фильтр периода и переключатель */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-40" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        {/* Таблица skeleton */}
        <Card className="card p-0! overflow-hidden">
          <div className="py-5 px-6 border-b border-[#EEE]">
            <Skeleton className="h-6 w-64" />
          </div>
          <CardContent className="p-0! overflow-x-auto">
            <div className="p-6 space-y-4">
              {/* Заголовки таблицы */}
              <div className="grid grid-cols-9 gap-4 pb-4 border-b">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>

              {/* Строки данных */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="grid grid-cols-9 gap-4 py-3">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <Skeleton key={j} className="h-5 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
