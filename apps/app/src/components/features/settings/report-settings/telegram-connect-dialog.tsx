"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@calls/ui";
import { Copy, ExternalLink, MessageCircle, Smartphone } from "lucide-react";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface TelegramConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null | undefined;
  botUsername: string;
  token: string;
  loading: boolean;
}

export function TelegramConnectDialog({
  open,
  onOpenChange,
  url,
  botUsername,
  token,
  loading,
}: TelegramConnectDialogProps) {
  const [copied, setCopied] = useState(false);

  // tg:// deeplink для desktop приложения
  const tgDeepLink = url
    ? url.replace("https://t.me/", "tg://resolve?domain=")
    : null;

  const handleCopyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Ссылка скопирована в буфер обмена");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const handleOpenTg = () => {
    if (!tgDeepLink) return;
    // Пробуем открыть через tg:// протокол
    window.location.href = tgDeepLink;
    // Fallback: если tg:// не сработал, через 500мс открываем https
    setTimeout(() => {
      if (url && document.visibilityState === "visible") {
        window.open(url, "_blank");
      }
    }, 500);
  };

  const handleOpenWeb = () => {
    if (!url) return;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            Подключение Telegram
          </DialogTitle>
          <DialogDescription>
            Выберите удобный способ подключения к боту для получения отчетов
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Генерация ссылки...</div>
          </div>
        ) : url ? (
          <div className="space-y-6">
            {/* QR-код */}
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg border bg-white p-4">
                <QRCodeSVG
                  value={url}
                  size={180}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="text-muted-foreground text-sm text-center">
                Отсканируйте QR-код камерой телефона
              </p>
            </div>

            {/* Кнопки действий */}
            <div className="grid gap-2">
              <Button
                variant="default"
                onClick={handleOpenTg}
                className="w-full justify-start gap-2"
              >
                <Smartphone className="h-4 w-4" />
                Открыть в приложении Telegram
              </Button>

              <Button
                variant="outline"
                onClick={handleOpenWeb}
                className="w-full justify-start gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Открыть веб-версию (t.me)
              </Button>

              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="w-full justify-start gap-2"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Скопировано!" : "Копировать ссылку"}
              </Button>
            </div>

            {/* Ручная инструкция */}
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="font-medium text-sm">Или найдите бота вручную:</p>
              <ol className="text-muted-foreground text-sm space-y-1 list-decimal list-inside">
                <li>
                  Откройте Telegram и найдите бота: <strong>@{botUsername}</strong>
                </li>
                <li>
                  Отправьте команду: <code className="bg-background px-1.5 py-0.5 rounded text-xs">/start {token}</code>
                </li>
                <li>Нажмите кнопку «Проверить подключение» ниже</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="text-destructive text-center py-4">
            Не удалось получить ссылку для подключения
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
