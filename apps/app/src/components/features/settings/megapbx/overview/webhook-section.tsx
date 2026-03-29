"use client";

import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PasswordInput,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from "@calls/ui";
import { useCopyToClipboard } from "@calls/ui/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { type WebhookFormData, webhookFormSchema } from "../schemas";
import { SectionBlock } from "../section-block";
import { generateWebhookSecret } from "../utils";

const ICON_BUTTON_CLASS =
  "shrink-0 transition-transform duration-150 active:scale-90";

interface WebhookSectionProps {
  webhookUrl: string;
  webhookSecret: string;
  webhookSecretPasswordSet: boolean;
  saving: boolean;
  onSaveWebhook: (data: WebhookFormData) => Promise<void>;
}

export function WebhookSection({
  webhookUrl,
  webhookSecret,
  webhookSecretPasswordSet,
  saving,
  onSaveWebhook,
}: WebhookSectionProps) {
  const { isCopied: copiedUrl, copyToClipboard: copyUrl } = useCopyToClipboard({
    timeout: 2000,
  });
  const { isCopied: copiedSecret, copyToClipboard: copySecret } =
    useCopyToClipboard({ timeout: 2000 });
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
    toast.success(
      "Секрет сгенерирован. Сохраните настройки и укажите его в админке АТС.",
    );
    setGenerated(true);
    setTimeout(() => setGenerated(false), 2000);
  }, [form]);

  const onSubmit = async (data: WebhookFormData) => {
    await onSaveWebhook(data);
  };

  return (
    <SectionBlock
      title="Webhook для АТС"
      description="Укажите наш URL и секрет в админке АТС — АТС будет отправлять события на наш сервер."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <div className="space-y-4">
            <div className="space-y-2">
              <FormLabel
                htmlFor="megapbx-webhook-url"
                className="text-xs text-muted-foreground"
              >
                URL вебхука (наш адрес)
              </FormLabel>
              <div className="flex gap-2">
                <Input
                  id="megapbx-webhook-url"
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
                      className={ICON_BUTTON_CLASS}
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
                  <TooltipContent>
                    {copiedUrl ? "Скопировано" : "Скопировать URL"}
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">
                Вставьте этот URL в админке АТС в поле «URL вебхука» или
                «Webhook URL».
              </p>
            </div>
            <FormField
              control={form.control}
              name="webhookSecret"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs text-muted-foreground">
                    Секрет вебхука (наш секрет)
                  </FormLabel>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <FormControl>
                        <PasswordInput
                          {...field}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder={
                            webhookSecretPasswordSet
                              ? "•••••••• (оставьте пустым, чтобы не менять)…"
                              : "Например: a1b2c3d4e5f6…"
                          }
                          className="w-full font-mono text-sm"
                        />
                      </FormControl>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={ICON_BUTTON_CLASS}
                          onClick={handleGenerateSecret}
                          aria-label={
                            generated ? "Сгенерировано" : "Сгенерировать секрет"
                          }
                        >
                          {generated ? (
                            <Check
                              className="size-4 text-success"
                              aria-hidden
                            />
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
                          className={ICON_BUTTON_CLASS}
                          onClick={copyWebhookSecret}
                          disabled={!webhookSecretValue && !webhookSecret}
                          aria-label={
                            copiedSecret ? "Скопировано" : "Скопировать секрет"
                          }
                        >
                          {copiedSecret ? (
                            <Check
                              className="size-4 text-success"
                              aria-hidden
                            />
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
                    Задайте секрет здесь, сохраните, затем укажите тот же секрет
                    в админке АТС.
                  </p>
                  <FormMessage />
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={saving}
                      aria-busy={saving}
                      aria-live="polite"
                    >
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      Сохранить
                    </Button>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </SectionBlock>
  );
}
