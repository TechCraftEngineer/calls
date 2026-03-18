"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DatePicker,
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
  Input,
  Label,
  PasswordInput,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from "@calls/ui";
import { useCopyToClipboard } from "@calls/ui/hooks";
import {
  Check,
  Copy,
  Database,
  Info,
  KeyRound,
  Mic,
  PhoneCall,
  Users,
  Webhook,
} from "lucide-react";
import { useCallback, useState } from "react";
import type { Prompt } from "../types";
import { SectionBlock } from "./section-block";

function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface OverviewTabProps {
  prompts: Record<string, Prompt>;
  baseUrl: string;
  apiKeySet: boolean;
  hasConnection: boolean;
  configuredFeatures: string[];
  testMessage: string;
  webhookUrl: string;
  saving: boolean;
  testing: boolean;
  syncing: "directory" | "calls" | "recordings" | null;
  onPromptChange: (
    key: string,
    field: "value" | "description",
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onPromptValueChange: (key: string, value: string) => void;
  onToggleChange: (key: string, checked: boolean) => void;
  onSave: () => Promise<void>;
  onTest: () => Promise<void>;
  onSyncDirectory: () => Promise<void>;
  onSyncCalls: () => Promise<void>;
  onSyncRecordings: () => Promise<void>;
}

export function OverviewTab({
  prompts,
  baseUrl,
  apiKeySet: _apiKeySet,
  hasConnection: _hasConnection,
  configuredFeatures,
  testMessage,
  webhookUrl,
  saving,
  testing,
  syncing,
  onPromptChange,
  onPromptValueChange,
  onToggleChange,
  onSave,
  onTest,
  onSyncDirectory,
  onSyncCalls,
  onSyncRecordings,
}: OverviewTabProps) {
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

  const iconButtonClass =
    "shrink-0 transition-transform duration-150 active:scale-90";

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void onSave();
    },
    [onSave],
  );

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
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
              Используется как стартовая дата для первой загрузки истории
              звонков.
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
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Что синхронизировать"
        description="Включите только те данные, которые реально нужны в рабочем пространстве."
      >
        <FieldGroup className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {(
            [
              [
                "megapbx_sync_employees",
                "Сотрудники",
                "Справочник сотрудников из АТС",
                <Users key="employees" aria-hidden className="size-4" />,
              ],
              [
                "megapbx_sync_numbers",
                "Номера",
                "Внешние и внутренние номера",
                <Database key="numbers" aria-hidden className="size-4" />,
              ],
              [
                "megapbx_sync_calls",
                "Звонки",
                "Импорт истории звонков в систему",
                <PhoneCall key="calls" aria-hidden className="size-4" />,
              ],
              [
                "megapbx_sync_recordings",
                "Записи",
                "Загрузка и привязка аудиофайлов",
                <Mic key="recordings" aria-hidden className="size-4" />,
              ],
              [
                "megapbx_webhooks_enabled",
                "Вебхуки",
                "Быстрый запуск синка по событию",
                <Webhook key="webhooks" aria-hidden className="size-4" />,
              ],
            ] as [string, string, string, React.ReactNode][]
          ).map(([key, label, hint, icon]) => (
            <FieldLabel key={key} htmlFor={key} className="!p-0">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle className="flex items-center gap-2">
                    <div className="bg-background border-border flex shrink-0 items-center justify-center rounded-md border p-1.5 shadow-xs shadow-black/5">
                      {icon}
                    </div>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-sm font-semibold">{label}</span>
                      <FieldDescription className="text-muted-foreground mt-0 text-xs">
                        {hint}
                      </FieldDescription>
                    </div>
                  </FieldTitle>
                </FieldContent>
                <Switch
                  id={key}
                  size="sm"
                  checked={prompts[key]?.value === "true"}
                  onCheckedChange={(checked) =>
                    onToggleChange(key, checked === true)
                  }
                />
              </Field>
            </FieldLabel>
          ))}
        </FieldGroup>
      </SectionBlock>

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
                      className={iconButtonClass}
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
                      className={iconButtonClass}
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
                      className={iconButtonClass}
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
                <Button type="button" onClick={onSave} disabled={saving}>
                  {saving ? "Сохранение…" : "Сохранить"}
                </Button>
              </div>
            </div>
          </div>
          <div
            role="status"
            className="flex gap-3 rounded-lg border border-border/60 border-l-4 border-l-primary/50 bg-muted/30 px-4 py-3"
          >
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

      {testMessage && (
        <Card className="rounded-lg border-border/60">
          <CardContent className="px-4 py-3 text-sm">{testMessage}</CardContent>
        </Card>
      )}

      <SectionBlock
        title="Быстрые действия"
        description="Сохраните настройки, затем при необходимости вручную запустите синхронизацию."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              [
                "directory",
                "Справочник",
                "Сотрудники и номера",
                onSyncDirectory,
                <Database key="dir" className="size-4 text-muted-foreground" />,
              ],
              [
                "calls",
                "Звонки",
                "Импорт истории вызовов",
                onSyncCalls,
                <PhoneCall
                  key="calls"
                  className="size-4 text-muted-foreground"
                />,
              ],
              [
                "recordings",
                "Записи",
                "Загрузка аудио по звонкам",
                onSyncRecordings,
                <Mic key="rec" className="size-4 text-muted-foreground" />,
              ],
            ] as [
              "directory" | "calls" | "recordings",
              string,
              string,
              () => void,
              React.ReactNode,
            ][]
          ).map(([key, title, description, onSync, icon]) => (
            <Card
              key={key}
              className="gap-4 py-4 transition-colors hover:border-border hover:bg-muted/30"
            >
              <CardHeader className="flex flex-col gap-2 px-4 pb-0">
                <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                  {icon}
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription className="text-sm">
                  {description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="px-4 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSync}
                  disabled={syncing !== null}
                  className="w-full transition-transform duration-150 active:scale-[0.98]"
                >
                  {syncing === key ? "Синк…" : "Запустить"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </SectionBlock>
    </form>
  );
}
