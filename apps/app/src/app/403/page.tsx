"use client";

import { paths } from "@calls/config";
import { Button } from "@calls/ui";
import { useRouter } from "next/navigation";

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F7] px-4 py-12 font-sans">
      <div className="max-w-md w-full bg-white rounded-[40px] p-12 shadow-[0_40px_100px_rgba(0,0,0,0.08)] text-center relative overflow-hidden flex flex-col items-center">
        {/* Анимированный фон (мягкие пятна) */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#FF6B35]/5 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-[#F7931E]/5 rounded-full blur-[80px] animate-pulse delay-700" />

        <div className="relative z-10 w-full">
          <div className="mx-auto w-24 h-24 bg-linear-to-br from-[#FF6B35] to-[#F7931E] rounded-3xl flex items-center justify-center shadow-[0_20px_40px_rgba(255,107,53,0.3)] mb-10 transform hover:scale-105 transition-transform duration-700 ease-out cursor-default">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <div className="space-y-4 mb-12">
            <h1 className="text-[120px] font-black leading-none text-[#1A1A1A] tracking-tighter opacity-10 absolute left-1/2 -top-12 -translate-x-1/2 select-none">
              403
            </h1>
            <h2 className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
              Доступ ограничен
            </h2>
            <p className="text-[#666] text-lg leading-relaxed max-w-[280px] mx-auto">
              У вас недостаточно прав для просмотра этого раздела.
            </p>
          </div>

          <div className="flex flex-col gap-4 w-full">
            <Button
              onClick={() => router.push(paths.dashboard.root)}
              className="w-full bg-[#1A1A1A] hover:bg-black text-white rounded-2xl py-7 text-base font-bold transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] hover:-translate-y-1 active:translate-y-0"
            >
              Вернуться на главную
            </Button>

            <button
              onClick={() => router.back()}
              className="w-full py-4 text-[#999] hover:text-[#333] font-semibold transition-colors flex items-center justify-center gap-2 group"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transform group-hover:-translate-x-1 transition-transform"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Назад
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center gap-4 animate-fade-in">
        <div className="h-px w-12 bg-[#DDD]" />
        <div className="text-[#999] text-xs font-bold uppercase tracking-[0.2em]">
          Security Protocol Alpha
        </div>
      </div>
    </div>
  );
}
