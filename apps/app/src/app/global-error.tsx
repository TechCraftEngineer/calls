"use client";

import { paths } from "@calls/config";
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
      <body className="m-0 font-['Inter',sans-serif]">
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F7] p-6">
          <div className="text-center max-w-[400px]">
            <h1 className="mb-4 text-2xl font-bold text-[#111]">
              Критическая ошибка
            </h1>
            <p className="mb-8 text-[#666] leading-relaxed">
              Приложение столкнулось с серьёзной ошибкой. Пожалуйста, обновите
              страницу или вернитесь на главную.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={reset}
                className="py-3 px-6 rounded-lg border-none bg-[#FFD600] font-semibold cursor-pointer"
              >
                Попробовать снова
              </button>
              <a
                href={paths.root}
                className="py-3 px-6 rounded-lg border border-[#ddd] bg-white font-semibold text-[#333] no-underline"
              >
                На главную
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
