"use client";

import { paths } from "@calls/config";
import { Button } from "@calls/ui";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Логирование в dev (в проде можно отправлять в Sentry и т.п.)
    if (process.env.NODE_ENV === "development") {
      console.error("Route error:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F7]">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">Что-то пошло не так</h1>
        <p className="mb-8 text-gray-600">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу.
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
  );
}
