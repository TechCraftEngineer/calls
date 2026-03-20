"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calls/ui";
import { ChevronDown } from "lucide-react";
import type { ReportType } from "../types";
import { REPORT_TYPE_LABELS } from "../types";

interface SendTestReportButtonProps {
  onSendTest: (reportType: ReportType) => void;
  primaryReportType: ReportType;
  primaryReportLabel: string;
  sendTestLoading: boolean;
  canSendTest: boolean;
  variant?: "default" | "success";
  size?: "default" | "sm";
}

export function SendTestReportButton({
  onSendTest,
  primaryReportType,
  primaryReportLabel,
  sendTestLoading,
  canSendTest,
  variant = "default",
  size = "default",
}: SendTestReportButtonProps) {
  const disabled = !canSendTest || sendTestLoading;

  return (
    <div className="flex items-center">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={() => onSendTest(primaryReportType)}
        className="rounded-r-none"
      >
        {sendTestLoading
          ? `Отправка ${primaryReportLabel.toLowerCase()} отчёта…`
          : `Отправить ${primaryReportLabel.toLowerCase()} отчёт`}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={variant}
            size={size}
            disabled={disabled}
            className="rounded-l-none border-l border-primary-foreground/20 px-2"
            aria-label="Выбрать тип отчёта"
          >
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onSendTest("daily")}>
            {REPORT_TYPE_LABELS.daily} отчёт
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSendTest("weekly")}>
            {REPORT_TYPE_LABELS.weekly} отчёт
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSendTest("monthly")}>
            {REPORT_TYPE_LABELS.monthly} отчёт
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
