"use client";

import { paths } from "@calls/config";
import { Badge, Card, CardContent } from "@calls/ui";
import Link from "next/link";
import { useEffect } from "react";
import { useSettings } from "@/components/features/settings/hooks";
import { PbxProviderLogo } from "@/components/features/settings/pbx-provider-logo";
import SettingsPageShell from "@/components/features/settings/settings-page-shell";

const PROVIDERS = [
  {
    id: "megafon",
    name: "Мегафон",
    status: "Доступно",
    href: paths.settings.pbxMegafon,
    features: ["Сотрудники", "Номера", "Звонки"],
    available: true,
  },
  {
    id: "mango",
    name: "Mango Office",
    status: "Скоро",
    href: null,
    features: ["Звонки", "Записи"],
    available: false,
  },
  {
    id: "mts",
    name: "МТС Exolve",
    status: "Скоро",
    href: null,
    features: ["События", "Записи"],
    available: false,
  },
  {
    id: "beeline",
    name: "Билайн",
    status: "Скоро",
    href: null,
    features: ["Номера", "Звонки"],
    available: false,
  },
] as const;

export default function SettingsPbxProvidersPage() {
  const { state, loadSettings } = useSettings();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (state.loading) {
    return (
      <SettingsPageShell>
        <div className="flex items-center justify-center py-24">
          <div className="text-muted-foreground">Загрузка…</div>
        </div>
      </SettingsPageShell>
    );
  }

  const availableProviders = PROVIDERS.filter((provider) => provider.available);
  const plannedProviders = PROVIDERS.filter((provider) => !provider.available);
  const isMegafonEnabled = state.megaPbx.enabled;
  const megafonBaseUrl = state.megaPbx.baseUrl.trim();
  const megafonApiKeySet = state.megaPbx.apiKeySet;
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
        <Badge variant="secondary">Скоро: {plannedProviders.length}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PROVIDERS.map((provider) => (
          <div key={provider.id}>
            {provider.available && provider.href ? (
              <Link
                href={provider.href}
                className="block transition-opacity hover:opacity-95"
              >
                <Card className="h-full overflow-hidden transition-colors hover:border-primary/30 hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <PbxProviderLogo providerId={provider.id} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold">
                            {provider.name}
                          </div>
                          <Badge variant="secondary">{megafonStatus}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {provider.features.map((feature) => (
                            <Badge
                              key={feature}
                              variant="secondary"
                              className="bg-muted px-2 py-0"
                            >
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Card className="h-full overflow-hidden border-border/60 bg-muted/30 opacity-90">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <PbxProviderLogo providerId={provider.id} muted />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-muted-foreground">
                          {provider.name}
                        </div>
                        <Badge variant="outline">{provider.status}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {provider.features.map((feature) => (
                          <Badge
                            key={feature}
                            variant="secondary"
                            className="bg-muted/80 px-2 py-0 text-muted-foreground"
                          >
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>
    </SettingsPageShell>
  );
}
