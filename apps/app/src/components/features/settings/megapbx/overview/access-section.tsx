"use client";

import { Button, DatePicker, Input, Label, PasswordInput } from "@calls/ui";
import type { Prompt } from "../../types";
import { SectionBlock } from "../section-block";

interface AccessSectionProps {
  prompts: Record<string, Prompt>;
  baseUrl: string;
  saving: boolean;
  testing: boolean;
  onPromptChange: (
    key: string,
    field: "value" | "description",
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onPromptValueChange: (key: string, value: string) => void;
  onTest: () => Promise<void>;
  onSaveAccess: () => Promise<void>;
}

export function AccessSection({
  prompts,
  baseUrl,
  saving,
  testing,
  onPromptChange,
  onPromptValueChange,
  onTest,
  onSaveAccess,
}: AccessSectionProps) {
  return (
    <SectionBlock
      title="Доступ к API"
      description="Укажите домен АТС и API key. Этого достаточно для проверки соединения и запуска синхронизации."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor="megapbx-base-url"
            className="text-xs text-muted-foreground"
          >
            Base URL / домен АТС
          </Label>
          <Input
            id="megapbx-base-url"
            value={baseUrl}
            onChange={onPromptChange("megapbx_base_url", "value")}
            placeholder="https://123456.megapbx.ru"
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Можно указать полный URL или только домен.
          </p>
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="megapbx-api-key"
            className="text-xs text-muted-foreground"
          >
            API key
          </Label>
          <PasswordInput
            id="megapbx-api-key"
            value={prompts.megapbx_api_key?.value ?? ""}
            onChange={onPromptChange("megapbx_api_key", "value")}
            placeholder={
              prompts.megapbx_api_key?.meta?.passwordSet
                ? "•••••••• (оставьте пустым, чтобы не менять)"
                : "Ключ авторизации"
            }
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Ключ хранится в зашифрованном виде.
          </p>
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="megapbx-sync-from-date"
            className="text-xs text-muted-foreground"
          >
            Импорт звонков с даты
          </Label>
          <DatePicker
            id="megapbx-sync-from-date"
            value={prompts.megapbx_sync_from_date?.value ?? ""}
            onChange={(value) =>
              onPromptValueChange("megapbx_sync_from_date", value)
            }
            placeholder="Выберите дату"
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Используется как стартовая дата для первой загрузки истории звонков.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onTest}
          disabled={testing || !baseUrl.trim()}
        >
          {testing ? "Проверка…" : "Проверить API"}
        </Button>
        <Button type="button" onClick={onSaveAccess} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>
    </SectionBlock>
  );
}
