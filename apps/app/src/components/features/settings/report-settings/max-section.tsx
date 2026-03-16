"use client";

import { Button, Input } from "@calls/ui";
import type React from "react";
import type { User } from "@/lib/auth";

interface MaxReportSectionProps {
  form: {
    maxChatId?: string;
    max_daily_report?: boolean;
    max_manager_report?: boolean;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  isAdmin: boolean;
  user?: User;
  onConnect?: () => void;
  onDisconnect?: () => void;
  connectLoading?: boolean;
  disconnectLoading?: boolean;
}

export function MaxReportSection({
  form,
  setForm,
  isAdmin,
  user,
  onConnect,
  onDisconnect,
  connectLoading,
  disconnectLoading,
}: MaxReportSectionProps) {
  const hasMax = !!form.maxChatId?.trim();

  return (
    <div className="p-4 bg-[#f5f7fa] rounded-lg">
      <h4 className="m-0 mb-3 text-sm font-bold">MAX Отчеты</h4>
      <p className="m-0 mb-3 text-xs text-[#666]">
        Отчёты в мессенджер MAX. Для участников — только свои отчёты.
      </p>
      <div className="mb-3">
        <label className="block mb-1 text-[13px] font-semibold">
          MAX Chat ID
        </label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={form.maxChatId ?? ""}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                maxChatId: e.target.value,
              }))
            }
            className="flex-1 py-2 px-3 border border-[#ddd] rounded-md"
            placeholder="Подключите MAX или введите ID чата вручную"
          />
          {hasMax && onDisconnect && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              disabled={disconnectLoading}
              className="text-[13px] text-[#FF5252] border-[#FF5252] hover:bg-red-50 hover:text-[#FF5252] shrink-0"
            >
              {disconnectLoading ? "…" : "Отвязать"}
            </Button>
          )}
        </div>
        {user && onConnect && !hasMax && (
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onConnect}
              disabled={connectLoading}
              className="text-[13px] text-[#6f42c1] border-[#6f42c1] hover:bg-purple-50 hover:text-[#6f42c1]"
            >
              <span className="text-base">⚡</span> Подключить MAX
            </Button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.max_daily_report}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                max_daily_report: e.target.checked,
              }))
            }
          />{" "}
          Получать свои ежедневные отчеты (MAX)
        </label>
        {isAdmin && (
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={form.max_manager_report}
              onChange={(e) =>
                setForm((f: any) => ({
                  ...f,
                  max_manager_report: e.target.checked,
                }))
              }
            />{" "}
            Получать отчеты по всем менеджерам (MAX)
          </label>
        )}
      </div>
    </div>
  );
}
