"use client";

import { paths } from "@calls/config";
import { Button } from "@calls/ui";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Global error:", error);
    }
  }, [error]);

  return (
    <html lang="ru">
      <body className="m-0 font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-6">
          <div className="max-w-[400px] text-center">
            <h1 className="mb-4 text-2xl font-bold text-foreground">
              Критическая ошибка
            </h1>
            <p className="mb-8 leading-relaxed text-muted-foreground">
              Приложение столкнулось с серьёзной ошибкой. Пожалуйста, обновите
              страницу или вернитесь на главную.
            </p>
            <div className="flex justify-center gap-4">
              <Button type="button" onClick={reset}>
                Попробовать снова
              </Button>
              <Button asChild variant="link" className="text-foreground">
                <Link href={paths.root}>На главную</Link>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
