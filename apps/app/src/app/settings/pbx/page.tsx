"use client";

import { paths } from "@calls/config";
import { Badge, Button, Card, CardContent } from "@calls/ui";
import Link from "next/link";
import { useEffect } from "react";
import { useSettings } from "@/components/features/settings/hooks";
import SettingsPageShell from "@/components/features/settings/settings-page-shell";

const PROVIDERS = [
  {
    id: "megafon",
    name: "Мегафон",
    description:
      "Интеграция с АТС Мегафон: сотрудники, номера, звонки, записи и ручная привязка пользователей.",
    status: "Доступно",
    href: paths.settings.pbxMegafon,
    features: ["API", "Сотрудники", "Номера", "Звонки", "Записи"],
    available: true,
  },
  {
    id: "mango",
    name: "Mango Office",
    description:
      "Подготовим отдельный экран настройки и сценарии синхронизации для Mango Office.",
    status: "Скоро",
    href: null,
    features: ["API", "Звонки", "Записи"],
    available: false,
  },
  {
    id: "mts",
    name: "МТС Exolve",
    description:
      "Провайдер появится как отдельная интеграция, когда будет готова схема подключения.",
    status: "Скоро",
    href: null,
    features: ["API", "События", "Записи"],
    available: false,
  },
  {
    id: "beeline",
    name: "Билайн",
    description:
      "Для Билайна будет добавлена отдельная страница настройки после появления требований.",
    status: "Скоро",
    href: null,
    features: ["API", "Номера", "Звонки"],
    available: false,
  },
] as const;

export default function SettingsPbxProvidersPage() {
  const { state, loadSettings } = useSettings();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const availableProviders = PROVIDERS.filter((provider) => provider.available);
  const plannedProviders = PROVIDERS.filter((provider) => !provider.available);
  const isMegafonEnabled = state.prompts.megapbx_enabled?.value === "true";
  const megafonBaseUrl = state.prompts.megapbx_base_url?.value?.trim() ?? "";
  const megafonApiKeySet = Boolean(
    state.prompts.megapbx_api_key?.meta?.passwordSet,
  );
  const megafonStatus =
    !megafonBaseUrl || !megafonApiKeySet
      ? "Не настроено"
      : isMegafonEnabled
        ? "Подключено"
        : "Настроено";

  return (
    <SettingsPageShell>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Настройки АТС</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Выберите доступную АТС для настройки интеграции
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="secondary">Доступно: {availableProviders.length}</Badge>
        <Badge variant="outline">Скоро: {plannedProviders.length}</Badge>
      </div>

      <div className="space-y-3">
        {PROVIDERS.map((provider) => (
          <Card
            key={provider.id}
            className="overflow-hidden border-border/60 bg-card shadow-sm"
          >
            <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base">
                    ☎
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">{provider.name}</div>
                      <Badge
                        variant={provider.available ? "secondary" : "outline"}
                      >
                        {provider.status}
                      </Badge>
                      <Badge variant="outline">
                        {provider.available && provider.id === "megafon"
                          ? megafonStatus
                          : "Недоступно"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {provider.available
                        ? "Сотрудники, номера, звонки"
                        : "Появится позже"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {provider.features.map((feature) => (
                        <Badge key={feature} variant="outline">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:shrink-0">
                {provider.available && provider.href ? (
                  <Button asChild>
                    <Link href={provider.href}>Открыть настройки</Link>
                  </Button>
                ) : (
                  <Button disabled variant="outline">
                    Скоро будет доступно
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsPageShell>
  );
}
