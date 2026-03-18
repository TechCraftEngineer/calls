"use client";

import { paths } from "@calls/config";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calls/ui";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { TelegramSectionProps } from "./types";

const REPORT_TYPE_LABELS = {
  daily: "Ежедневный",
  weekly: "Еженедельный",
  monthly: "Ежемесячный",
} as const;

export default function TelegramSection({
  sendTestLoading,
  sendTestReportType,
  sendTestMessage,
  onSendTest,
}: TelegramSectionProps) {
  const isSuccess =
    sendTestMessage?.includes("успешно") ||
    sendTestMessage?.includes("Отправка завершена") ||
    sendTestMessage?.includes("отправлен");
  const primaryReportType = sendTestReportType ?? "daily";
  const primaryLabel = REPORT_TYPE_LABELS[primaryReportType];

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
          <div className="flex items-center">
            <Button
              type="button"
              disabled={sendTestLoading}
              onClick={() => onSendTest(primaryReportType)}
              variant="default"
              className="rounded-r-none"
            >
              {sendTestLoading
                ? `Отправка ${primaryLabel.toLowerCase()} отчёта…`
                : `Отправить ${primaryLabel.toLowerCase()} отчёт`}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="default"
                  className="rounded-l-none border-l border-primary-foreground/20 px-2"
                  disabled={sendTestLoading}
                  aria-label="Выбрать тип отчёта"
                >
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onSendTest("daily")}>
                  Ежедневный отчёт
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSendTest("weekly")}>
                  Еженедельный отчёт
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSendTest("monthly")}>
                  Ежемесячный отчёт
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button variant="outline" asChild>
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
