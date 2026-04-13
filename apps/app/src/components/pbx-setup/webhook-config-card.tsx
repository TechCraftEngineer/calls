"use client";

import { Button, Card } from "@calls/ui";
import { Copy, Key } from "lucide-react";

interface WebhookConfigCardProps {
  webhookUrl: string;
  webhookSecret: string;
  webhookSecretLoading: boolean;
  onCopy: (text: string, label: string) => void;
}

export function WebhookConfigCard({
  webhookUrl,
  webhookSecret,
  webhookSecretLoading,
  onCopy,
}: WebhookConfigCardProps) {
  return (
    <Card className="mb-6 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Key className="size-5 text-primary" />
        Настройка вебхука
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Укажите эти данные в настройках вашей АТС для получения событий о звонках
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">URL вебхука</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm">
              {webhookUrl || "Загрузка..."}
            </code>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onCopy(webhookUrl, "URL")}
              disabled={!webhookUrl}
              aria-label="Скопировать URL вебхука"
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Секретный ключ (X-Webhook-Signature)
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm font-mono">
              {webhookSecretLoading ? "Загрузка..." : webhookSecret}
            </code>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onCopy(webhookSecret, "Секрет")}
              disabled={!webhookSecret}
              aria-label="Скопировать секретный ключ"
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
