"use client";

import { Button, Input } from "@calls/ui";
import type { EditUserForm, WorkspaceMemberUser } from "../types";

interface TelegramSectionProps {
  form: EditUserForm;
  editUser: WorkspaceMemberUser & { telegramChatId?: string | null };
  onFormChange: (updates: Partial<EditUserForm>) => void;
  onDisconnect: () => void;
  onConnect: () => void;
  onCheckConnection: () => void;
}

export function TelegramSection({
  form,
  editUser,
  onFormChange,
  onDisconnect,
  onConnect,
  onCheckConnection,
}: TelegramSectionProps) {
  return (
    <div className="mb-4">
      <label className="block mb-1 text-sm font-semibold">Telegram Chat ID</label>
      <div className="flex gap-2">
        <Input
          type="text"
          value={form.telegramChatId}
          onChange={(e) => onFormChange({ telegramChatId: e.target.value })}
          className="flex-1 py-2 px-3 border border-[#ddd] rounded-md box-border"
          placeholder="ID чата пользователя"
        />
      </div>
      <div className="mt-2">
        {editUser.telegramChatId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            className="text-[13px] text-[#FF5252] border-[#FF5252] hover:bg-red-50 hover:text-[#FF5252]"
          >
            Отвязать Telegram
          </Button>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onConnect}
              className="text-[13px] text-[#0088cc] border-[#0088cc] hover:bg-blue-50 hover:text-[#0088cc]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.48-.94-2.4-1.54-1.06-.7-.37-1.09.23-1.72.16-.16 2.87-2.63 2.92-2.85.01-.03.01-.14-.06-.2-.06-.05-.16-.03-.24-.01-.34.08-5.34 3.45-5.56 3.6-.32.22-.6.33-.85.33-.28-.01-.81-.26-1.2-.56-.48-.38-.86-.58-.82-1.23.02-.34.49-.69 1.28-1.05 5.03-2.18 8.38-3.62 10.04-4.3 2.8-1.16 3.38-1.36 3.76-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z" />
              </svg>
              Подключить Telegram
            </Button>
            <Button type="button" variant="default" size="sm" onClick={onCheckConnection}>
              Проверить подключение
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
