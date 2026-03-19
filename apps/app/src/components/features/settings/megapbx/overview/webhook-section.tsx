"use client";

import {
  Button,
  Input,
  Label,
  PasswordInput,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from "@calls/ui";
import { useCopyToClipboard } from "@calls/ui/hooks";
import { Check, Copy, Info, KeyRound } from "lucide-react";
import { useCallback, useState } from "react";
import type { Prompt } from "../../types";
import { SectionBlock } from "../section-block";
import { generateWebhookSecret } from "../utils";

const ICON_BUTTON_CLASS =
  "shrink-0 transition-transform duration-150 active:scale-90";

interface WebhookSectionProps {
  prompts: Record<string, Prompt>;
  webhookUrl: string;
  saving: boolean;
  onPromptChange: (
    key: string,
    field: "value" | "description",
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onPromptValueChange: (key: string, value: string) => void;
}

export function WebhookSection({
  prompts,
  webhookUrl,
  saving,
  onPromptChange,
  onPromptValueChange,
}: WebhookSectionProps) {
  const { isCopied: copiedUrl, copyToClipboard: copyUrl } = useCopyToClipboard({
    timeout: 2000,
  });
  const { isCopied: copiedSecret, copyToClipboard: copySecret } =
    useCopyToClipboard({ timeout: 2000 });
  const [generated, setGenerated] = useState(false);

  const webhookSecretValue = prompts.megapbx_webhook_secret?.value ?? "";

  const copyWebhookUrl = useCallback(async () => {
    if (!webhookUrl) return;
    const ok = await copyUrl(webhookUrl);
    if (ok) toast.success("URL скопирован");
    else toast.error("Не удалось скопировать");
  }, [webhookUrl, copyUrl]);

  const copyWebhookSecret = useCallback(async () => {
    if (!webhookSecretValue) {
      toast.error("Сначала сгенерируйте или введите секрет");
      return;
    }
    const ok = await copySecret(webhookSecretValue);
    if (ok) toast.success("Секрет скопирован");
    else toast.error("Не удалось скопировать");
  }, [webhookSecretValue, copySecret]);

  const handleGenerateSecret = useCallback(() => {
    const secret = generateWebhookSecret();
    onPromptValueChange("megapbx_webhook_secret", secret);
    toast.success(
      "Секрет сгенерирован. Сохраните настройки и укажите его в админке АТС.",
    );
    setGenerated(true);
    setTimeout(() => setGenerated(false), 2000);
  }, [onPromptValueChange]);

  return (
    <SectionBlock
      title="Webhook для АТС"
      description="Укажите наш URL и секрет в админке АТС — АТС будет отправлять события на наш сервер."
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,560px)_1fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="megapbx-webhook-url"
              className="text-xs text-muted-foreground"
            >
              URL вебхука (наш адрес)
            </Label>
            <div className="flex gap-2">
              <Input
                id="megapbx-webhook-url"
                value={webhookUrl}
                readOnly
                className="font-mono text-sm"
                placeholder={
                  webhookUrl ? undefined : "Выберите рабочее пространство"
                }
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
              Вставьте этот URL в админке АТС в поле «URL вебхука» или «Webhook
              URL».
            </p>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="megapbx-webhook-secret"
              className="text-xs text-muted-foreground"
            >
              Секрет вебхука (наш секрет)
            </Label>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <PasswordInput
                  id="megapbx-webhook-secret"
                  value={prompts.megapbx_webhook_secret?.value ?? ""}
                  onChange={onPromptChange("megapbx_webhook_secret", "value")}
                  placeholder={
                    prompts.megapbx_webhook_secret?.meta?.passwordSet
                      ? "•••••••• (оставьте пустым, чтобы не менять)"
                      : "Задайте секрет и укажите его в админке АТС"
                  }
                  className="w-full font-mono text-sm"
                />
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
                    className={ICON_BUTTON_CLASS}
                    onClick={copyWebhookSecret}
                    disabled={!webhookSecretValue}
                    aria-label={
                      copiedSecret ? "Скопировано" : "Скопировать секрет"
                    }
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
              Задайте секрет здесь, сохраните, затем укажите тот же секрет в
              админке АТС. АТС должна передавать его в заголовке{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                X-Megapbx-Secret
              </code>{" "}
              или{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                X-Webhook-Secret
              </code>
              .
            </p>
            <div className="pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Сохранение…" : "Сохранить"}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex gap-3 rounded-lg border border-border/60 border-l-4 border-l-primary/50 bg-muted/30 px-4 py-3">
          <Info className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium text-foreground">
              Настройка в админке АТС
            </p>
            <ol className="text-muted-foreground list-decimal space-y-1 pl-4">
              <li>Скопируйте URL вебхука выше и вставьте в настройки АТС.</li>
              <li>
                Нажмите «Сгенерировать» или введите свой секрет, сохраните
                настройки.
              </li>
              <li>
                Укажите тот же секрет в админке АТС (если АТС поддерживает
                проверку подписи).
              </li>
            </ol>
          </div>
        </div>
      </div>
    </SectionBlock>
  );
}
