"use client";

import { Input } from "@calls/ui";
import type { EditUserForm, ManagedUser } from "../types";

interface MaxSectionProps {
  form: EditUserForm;
  editUser: ManagedUser;
  onFormChange: (updates: Partial<EditUserForm>) => void;
  onDisconnect: () => void;
  onConnect: () => void;
}

export function MaxSection({
  form,
  editUser,
  onFormChange,
  onDisconnect,
  onConnect,
}: MaxSectionProps) {
  return (
    <div className="mb-4 p-4 bg-[#f5f7fa] rounded-lg">
      <h3 className="m-0 mb-3 text-sm font-bold">MAX Отчеты</h3>
      <div className="mb-3">
        <label className="block mb-1 text-[13px] font-semibold">
          MAX Chat ID
        </label>
        <Input
          type="text"
          value={form.max_chat_id}
          onChange={(e) => onFormChange({ max_chat_id: e.target.value })}
          className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
          placeholder="ID чата MAX"
        />
      </div>
      <div className="mb-3">
        {editUser.max_chat_id ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="text-[13px] text-[#FF5252] bg-transparent border border-[#FF5252] rounded-md px-3 py-1.5 cursor-pointer"
          >
            Отвязать MAX
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            className="text-[13px] text-[#6f42c1] bg-transparent border border-[#6f42c1] rounded-md px-3 py-1.5 cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-base">⚡</span> Подключить MAX
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {(["max_daily_report", "max_manager_report"] as const).map((key) => (
          <label
            key={key}
            className="flex items-center gap-2 text-[13px] cursor-pointer"
          >
            <input
              type="checkbox"
              checked={form[key]}
              onChange={(e) => onFormChange({ [key]: e.target.checked })}
            />
            {key === "max_daily_report"
              ? "Получать свои ежедневные отчеты (MAX)"
              : "Получать отчеты по всем менеджерам (MAX)"}
          </label>
        ))}
      </div>
    </div>
  );
}
