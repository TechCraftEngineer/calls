"use client";

import { validateTelegramBotToken } from "@calls/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  PasswordInput,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@calls/ui";
import { useCallback, useState } from "react";
import type { IntegrationsSectionProps } from "../types";

const linkClass =
  "text-foreground underline underline-offset-2 hover:opacity-80";

const BOTFATHER_URL = "https://t.me/BotFather";
const TELEGRAM_BOT_DOCS_URL =
  "https://core.telegram.org/bots/features#creating-a-new-bot";
const MAX_PARTNERS_URL = "https://business.max.ru/self";
const MAX_DOCS_URL = "https://dev.max.ru/docs-api";
const MAX_BOTS_CREATE_URL =
  "https://dev.max.ru/docs/chatbots/bots-nocode/create";

export default function IntegrationsSection({
  integrations,
  onTelegramTokenChange,
  onMaxBotTokenChange,
  onSaveTelegram,
  onSaveMaxBot,
  telegramSaving,
  maxBotSaving,
}: IntegrationsSectionProps) {
  const [telegramError, setTelegramError] = useState<string | null>(null);

  const telegramValue = integrations.telegramBotToken;
  const hasCustomTelegramToken = telegramValue.trim().length > 0;
  const handleTelegramBlur = useCallback(() => {
    if (!telegramValue.trim()) {
      setTelegramError(null);
      return;
    }
    const validation = validateTelegramBotToken(telegramValue);
    setTelegramError(validation.isValid ? null : (validation.error ?? null));
  }, [telegramValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10">
            🔌
          </span>
          Интеграции компании
        </CardTitle>
        <CardDescription>
          Настройки подключений к Telegram и MAX Bot. Токены хранятся в базе в
          зашифрованном виде. Для Telegram можно использовать либо собственного
          бота компании, либо системного бота по умолчанию.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-4">
          <div>
            <h4 className="font-semibold text-sm">
              Telegram Bot (для отчётов и уведомлений)
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Если поле токена пустое, используется системный Telegram-бот.
            </p>
          </div>

          <div
            className={`rounded-md border p-3 text-xs ${
              hasCustomTelegramToken
                ? "border-primary/30 bg-primary/10 text-foreground"
                : integrations.telegramUsesDefault
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
            }`}
          >
            {hasCustomTelegramToken
              ? "Режим: используется Telegram-бот компании (ваш токен)."
              : integrations.telegramUsesDefault
                ? "Режим: используется системный Telegram-бот по умолчанию."
                : "Режим: Telegram отключен или токен не настроен."}
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-2">
              Как получить токен
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Откройте{" "}
                <a
                  href={BOTFATHER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  @BotFather
                </a>{" "}
                в Telegram
              </li>
              <li>Отправьте команду /newbot</li>
              <li>Укажите имя и username бота</li>
              <li>Скопируйте выданный токен в поле ниже</li>
            </ol>
          </div>

          <div className="space-y-2 max-w-md">
            <Label
              htmlFor="telegram-bot-token"
              className="text-xs text-muted-foreground flex items-center gap-1.5"
            >
              Токен бота
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Подсказка о формате токена"
                  >
                    ?
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-65">
                  Формат: 1234567890:ABCdefGHI... (цифры:буквы и цифры). Токен
                  выдаёт только @BotFather при создании бота.
                </TooltipContent>
              </Tooltip>
            </Label>
            <PasswordInput
              id="telegram-bot-token"
              value={telegramValue}
              onChange={(e) => {
                setTelegramError(null);
                onTelegramTokenChange(e);
              }}
              onBlur={handleTelegramBlur}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              autoComplete="off"
              className={`h-9 ${telegramError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              aria-invalid={!!telegramError}
              aria-describedby={
                telegramError ? "telegram-token-error" : undefined
              }
            />
            {telegramError && (
              <p
                id="telegram-token-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {telegramError}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Поле не обязательное: оставьте пустым, чтобы использовать
              системный бот.
            </p>
            {integrations.telegramUsesDefault && !hasCustomTelegramToken && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Сейчас активен системный бот по умолчанию.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              <a
                href={TELEGRAM_BOT_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Документация Telegram Bot API
              </a>
            </p>
            <Button onClick={onSaveTelegram} disabled={telegramSaving}>
              {telegramSaving ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-4">
          <div>
            <h4 className="font-semibold text-sm">MAX Bot (для отчётов)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Отправка отчётов через чат-бот в мессенджере MAX
            </p>
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-2">
              Как получить токен
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Зарегистрируйте организацию на платформе{" "}
                <a
                  href={MAX_PARTNERS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  MAX для партнёров
                </a>{" "}
                и пройдите верификацию
              </li>
              <li>Создайте чат-бота в разделе Чат-боты</li>
              <li>
                После модерации откройте Чат-боты → Интеграция → Получить токен
              </li>
              <li>Скопируйте выданный токен в поле ниже</li>
            </ol>
          </div>

          <div className="space-y-2 max-w-md">
            <Label
              htmlFor="max-bot-token"
              className="text-xs text-muted-foreground"
            >
              Токен бота
            </Label>
            <PasswordInput
              id="max-bot-token"
              value={integrations.maxBotToken}
              onChange={onMaxBotTokenChange}
              placeholder="AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
              autoComplete="off"
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground">
              <a
                href={MAX_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Документация API MAX
              </a>
              {" · "}
              <a
                href={MAX_BOTS_CREATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Создание чат-бота
              </a>
            </p>
            <Button onClick={onSaveMaxBot} disabled={maxBotSaving}>
              {maxBotSaving ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
