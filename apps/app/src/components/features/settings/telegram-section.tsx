"use client";

import { paths } from "@calls/config";
import { Button, Card, CardContent, CardHeader } from "@calls/ui";
import Link from "next/link";
import type { TelegramSectionProps } from "./types";

export default function TelegramSection({
  sendTestLoading,
  sendTestMessage,
  onSendTest,
}: TelegramSectionProps) {
  const isSuccess =
    sendTestMessage?.includes("успешно") ||
    sendTestMessage?.includes("Отправка завершена");

  return (
    <Card className="card mb-6">
      <CardHeader className="p-0 pb-0">
        <div className="section-title mb-3 flex items-center gap-2">
          <span className="text-lg">📊</span> Отчёты в Telegram
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-0">
        <p className="mb-4 text-sm text-[#555]">
          Подписки на ежедневный/еженедельный/ежемесячный отчёт и опция «не
          отправлять в выходные» настраиваются на странице{" "}
          <Link
            href={paths.statistics.settings}
            className="text-[#FF6B35] font-semibold"
          >
            Статистика
          </Link>{" "}
          → вкладка «Настройки отчетов».
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="button"
            disabled={sendTestLoading}
            onClick={onSendTest}
            className={
              sendTestLoading
                ? "py-2.5 px-5 border-none rounded-lg bg-[#ccc] text-white font-semibold cursor-not-allowed text-sm"
                : "py-2.5 px-5 border-none rounded-lg bg-gradient-to-br from-[#4CAF50] to-[#388E3C] text-white font-semibold text-sm"
            }
          >
            {sendTestLoading
              ? "Отправка…"
              : "Отправить тестовый отчёт в Telegram"}
          </Button>
          <Link
            href={paths.statistics.settings}
            className="py-2.5 px-4 rounded-lg border border-[#FF6B35] text-[#FF6B35] font-semibold no-underline text-sm"
          >
            Перейти к настройкам отчётов
          </Link>
          {sendTestMessage && (
            <span
              className={`text-sm ${
                isSuccess ? "text-[#4CAF50]" : "text-[#FF5252]"
              }`}
            >
              {sendTestMessage}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
