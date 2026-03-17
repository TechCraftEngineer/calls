"use client";

import { paths } from "@calls/config";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@calls/ui";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10">
            📊
          </span>
          Отчёты в Telegram
        </CardTitle>
        <CardDescription>
          Подписки на ежедневный/еженедельный/ежемесячный отчёт и опция «не
          отправлять в выходные» настраиваются на странице{" "}
          <Link
            href={paths.statistics.settings}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Статистика
          </Link>{" "}
          → вкладка «Настройки отчетов».
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={sendTestLoading}
            onClick={onSendTest}
            variant="default"
          >
            {sendTestLoading
              ? "Отправка…"
              : "Отправить тестовый отчёт в Telegram"}
          </Button>
          <Button variant="default" asChild>
            <Link href={paths.statistics.settings}>
              Перейти к настройкам отчётов
            </Link>
          </Button>
          {sendTestMessage && (
            <span
              className={`text-sm font-medium ${
                isSuccess
                  ? "text-green-600 dark:text-green-400"
                  : "text-destructive"
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
