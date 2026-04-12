"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  PasswordInput,
  toast,
} from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Key, Loader2, Webhook } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ModalProps } from "@/components/features/setup";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useORPC } from "@/orpc/react";

const apiSchema = z.object({
  baseUrl: z.string().url("Введите корректный URL"),
  apiKey: z.string().min(1, "API Key обязателен"),
});

export function ApiModal({ open, onOpenChange, onComplete }: ModalProps<void>) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const [testing, setTesting] = useState(false);

  const testPbxMutation = useMutation(orpc.settings.testPbx.mutationOptions());
  const updatePbxAccessMutation = useMutation(
    orpc.settings.updatePbxAccess.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.settings.getIntegrations.queryKey() });
      },
    }),
  );

  // Compute webhookUrl on client only to avoid SSR issues
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const webhookUrl = useMemo(() => {
    if (!activeWorkspace || !origin) return "";
    return `${origin}/api/webhooks/pbx/${activeWorkspace.id}`;
  }, [activeWorkspace, origin]);

  // Fetch webhook secret from server
  const { data: webhookSecretData } = useQuery({
    ...orpc.settings.getPbxWebhookSecret.queryOptions(),
    enabled: Boolean(activeWorkspace),
  });
  const webhookSecret = webhookSecretData?.webhookSecret ?? "";

  const form = useForm({
    resolver: zodResolver(apiSchema),
    mode: "onChange",
    defaultValues: { baseUrl: "", apiKey: "" },
  });

  const handleTestAndSave = async (values: z.infer<typeof apiSchema>) => {
    setTesting(true);
    try {
      const result = await testPbxMutation.mutateAsync({
        baseUrl: values.baseUrl.trim(),
        apiKey: values.apiKey.trim(),
      });
      const ok = result && typeof result === "object" && "success" in result && result.success;
      if (ok) {
        await updatePbxAccessMutation.mutateAsync({
          enabled: true,
          baseUrl: values.baseUrl.trim(),
          apiKey: values.apiKey.trim(),
          webhookSecret,
        });
        onComplete();
      } else {
        toast.error("Проверка не пройдена");
      }
    } catch (_err) {
      toast.error("Ошибка подключения");
    } finally {
      setTesting(false);
    }
  };

  const handleCopyWebhook = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      toast.success("URL скопирован в буфер обмена");
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(webhookSecret);
    toast.success("Секретный ключ скопирован в буфер обмена");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Подключение к API телефонии</DialogTitle>
        </DialogHeader>

        {/* Webhook URL Block */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Webhook className="size-4 text-primary" />
            URL для вебхука
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Укажите этот адрес в настройках вашей АТС для получения событий о звонках
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
              {webhookUrl || "Загрузка..."}
            </code>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0"
              onClick={handleCopyWebhook}
              disabled={!webhookUrl}
              title="Скопировать URL"
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>

        {/* Webhook Secret Block */}
        <div className="mt-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Key className="size-4 text-primary" />
            Секретный ключ вебхука
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Укажите этот ключ в настройках АТС для подписи вебхуков (X-Webhook-Signature)
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs font-mono">
              {webhookSecret}
            </code>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0"
              onClick={handleCopySecret}
              title="Скопировать секрет"
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(handleTestAndSave)} className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Base URL</label>
            <Input {...form.register("baseUrl")} placeholder="https://...megapbx.ru/crmapi/v1" />
            {form.formState.errors.baseUrl && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.baseUrl.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">API Key</label>
            <PasswordInput {...form.register("apiKey")} placeholder="Ключ авторизации" />
          </div>
          <Button type="submit" disabled={testing} className="w-full">
            {testing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Проверить и сохранить
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
