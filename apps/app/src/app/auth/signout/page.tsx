"use client";

import { paths } from "@calls/config";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/lib/auth";

export default function SignOutPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        await logout();
        if (isMounted) {
          setIsLoggingOut(false);
          // Очищаем куку активной компании при выходе
          // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
          document.cookie = "active_workspace_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          router.replace(paths.auth.signin);
        }
      } catch (err) {
        if (isMounted) {
          setIsLoggingOut(false);
          setError(err instanceof Error ? err.message : "Ошибка при выходе");
          // Автоматический редирект через 3 секунды даже при ошибке
          setTimeout(() => {
            router.replace(paths.auth.signin);
          }, 3000);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] font-[Inter]">
      <div className="w-full max-w-[420px] rounded-[16px] border-[#EEE] bg-white p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <div className="text-center">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#FFD600] text-black font-black text-[24px]">
            M
          </div>
          {error ? (
            <div className="space-y-4">
              <p className="text-[15px] text-red-600">{error}</p>
              <p className="text-[13px] text-[#888]">Перенаправление на страницу входа…</p>
            </div>
          ) : (
            <p className="text-[15px] text-[#888]">
              {isLoggingOut ? "Выход из системы…" : "Перенаправление…"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
