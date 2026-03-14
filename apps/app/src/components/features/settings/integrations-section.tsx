"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@calls/ui";
import type { IntegrationsSectionProps } from "./types";

export default function IntegrationsSection({
  prompts,
  onPromptChange,
}: IntegrationsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10">
            🔌
          </span>
          Интеграции рабочего пространства
        </CardTitle>
        <CardDescription>
          Настройки подключений к Telegram и MAX Bot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Telegram Bot */}
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-4">
          <h4 className="font-semibold text-sm">Telegram Bot (для отчётов)</h4>
          <div className="space-y-2 max-w-md">
            <Label
              htmlFor="telegram-bot-token"
              className="text-xs text-muted-foreground"
            >
              Token
            </Label>
            <Input
              id="telegram-bot-token"
              type="password"
              value={prompts.telegram_bot_token?.value ?? ""}
              onChange={onPromptChange("telegram_bot_token", "value")}
              placeholder="Введите токен бота"
              autoComplete="off"
              className="h-9"
            />
          </div>
        </div>

        {/* MAX Bot */}
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-4">
          <h4 className="font-semibold text-sm">MAX Bot (для отчётов)</h4>
          <div className="space-y-2 max-w-md">
            <Label
              htmlFor="max-bot-token"
              className="text-xs text-muted-foreground"
            >
              Token
            </Label>
            <Input
              id="max-bot-token"
              type="password"
              value={prompts.max_bot_token?.value ?? ""}
              onChange={onPromptChange("max_bot_token", "value")}
              placeholder="Введите токен бота"
              autoComplete="off"
              className="h-9"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
