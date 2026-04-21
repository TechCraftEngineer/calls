"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldContent,
  FieldDescription,
  FieldTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PasswordInput,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from "@calls/ui";
import { useCopyToClipboard } from "@calls/ui/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, KeyRound, Loader2, Webhook } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { type WebhookFormData, webhookFormSchema } from "../schemas";
import { generateWebhookSecret } from "../utils";

interface WebhookSectionProps {
  webhookUrl: string;
  webhookSecret: string;
  webhookSecretPasswordSet: boolean;
  webhooksEnabled: boolean;
  saving: boolean;
  savingWebhooksEnabled: boolean;
  onSaveWebhook: (data: WebhookFormData) => Promise<void>;
  onToggleWebhooksEnabled: (enabled: boolean) => Promise<void>;
}

export function WebhookSection({
  webhookUrl,
  webhookSecret,
  webhookSecretPasswordSet,
  webhooksEnabled,
  saving,
  savingWebhooksEnabled,
  onSaveWebhook,
  onToggleWebhooksEnabled,
}: WebhookSectionProps) {
  const { isCopied: copiedUrl, copyToClipboard: copyUrl } = useCopyToClipboard({ timeout: 2000 });
  const { isCopied: copiedSecret, copyToClipboard: copySecret } = useCopyToClipboard({
    timeout: 2000,
  });
  const [generated, setGenerated] = useState(false);

  const form = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema) as never,
    defaultValues: {
      webhookSecret: "",
    },
  });

  const webhookSecretValue = form.watch("webhookSecret") ?? "";

  useEffect(() => {
    form.reset({
      webhookSecret: webhookSecret || "",
    });
    setGenerated(false);
  }, [form, webhookSecret]);

  const copyWebhookUrl = useCallback(async () => {
    if (!webhookUrl) return;
    const ok = await copyUrl(webhookUrl);
    if (ok) toast.success("URL скопирован");
    else toast.error("Не удалось скопировать");
  }, [webhookUrl, copyUrl]);

  const copyWebhookSecret = useCallback(async () => {
    const val = webhookSecretValue || webhookSecret;
    if (!val) {
      toast.error("Сначала сгенерируйте или введите секрет");
      return;
    }
    const ok = await copySecret(val);
    if (ok) toast.success("Секрет скопирован");
    else toast.error("Не удалось скопировать");
  }, [webhookSecretValue, webhookSecret, copySecret]);

  const handleGenerateSecret = useCallback(() => {
    const secret = generateWebhookSecret();
    form.setValue("webhookSecret", secret, { shouldDirty: true });
    toast.success("Секрет сгенерирован. Сохраните настройки и укажите его в админке АТС.");
    setGenerated(true);
    setTimeout(() => setGenerated(false), 2000);
  }, [form]);

  const onSubmit = async (data: WebhookFormData) => {
    await onSaveWebhook(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook для АТС</CardTitle>
        <CardDescription>
          Укажите наш URL и секрет в админке АТС для получения событий
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle className="flex items-center gap-2">
                <div className="flex shrink-0 items-center justify-center rounded-md border bg-background p-1.5 shadow-sm">
                  <Webhook aria-hidden className="size-3.5" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-xs font-semibold">Вебхуки</span>
                  <FieldDescription className="mt-0 text-[11px] text-muted-foreground">
                    Быстрый запуск синхронизации по событию
                  </FieldDescription>
                </div>
              </FieldTitle>
            </FieldContent>
            <Switch
              id="megapbx-webhooks-enabled"
              size="sm"
              checked={webhooksEnabled}
              disabled={savingWebhooksEnabled}
              aria-label="Включить вебхуки"
              onCheckedChange={(checked) => {
                void onToggleWebhooksEnabled(checked);
              }}
            />
          </Field>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormItem className="space-y-2">
              <FormLabel htmlFor="webhook-url">URL вебхука (наш адрес)</FormLabel>
              <div className="flex gap-2">
                <Input
                  id="webhook-url"
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm"
                  placeholder={webhookUrl ? undefined : "Выберите компанию…"}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyWebhookUrl}
                      disabled={!webhookUrl}
                      aria-label={copiedUrl ? "Скопировано" : "Скопировать URL"}
                    >
                      {copiedUrl ? (
                        <Check className="size-4 text-success" aria-hidden />
                      ) : (
                        <Copy className="size-4" aria-hidden />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copiedUrl ? "Скопировано" : "Скопировать URL"}</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">Вставьте этот URL в админке АТС</p>
            </FormItem>

            <FormField
              control={form.control}
              name="webhookSecret"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Секрет вебхука (наш секрет)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <PasswordInput
                        {...field}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder={
                          webhookSecretPasswordSet ? "•••••••• (не менять)" : "a1b2c3d4e5f6…"
                        }
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleGenerateSecret}
                          aria-label={generated ? "Сгенерировано" : "Сгенерировать секрет"}
                        >
                          {generated ? (
                            <Check className="size-4 text-success" aria-hidden />
                          ) : (
                            <KeyRound className="size-4" aria-hidden />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {generated ? "Сгенерировано" : "Сгенерировать секрет"}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={copyWebhookSecret}
                          disabled={!webhookSecretValue && !webhookSecret}
                          aria-label={copiedSecret ? "Скопировано" : "Скопировать секрет"}
                        >
                          {copiedSecret ? (
                            <Check className="size-4 text-success" aria-hidden />
                          ) : (
                            <Copy className="size-4" aria-hidden />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {copiedSecret ? "Скопировано" : "Скопировать секрет"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Сохраните секрет и укажите его в админке АТС
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Сохранить
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
