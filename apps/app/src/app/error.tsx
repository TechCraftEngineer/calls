"use client";

import { paths } from "@calls/config";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
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
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          Что-то пошло не так
        </h1>
        <p className="mb-8 text-gray-600">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу.
        </p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-[#FFD600] px-6 py-3 font-semibold text-black transition-colors hover:bg-[#F0CC00]"
          >
            Попробовать снова
          </button>
          <Link
            href={paths.root}
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
