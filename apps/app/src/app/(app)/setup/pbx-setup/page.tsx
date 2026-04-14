"use client";

import { paths } from "@calls/config";
import { Button } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import Header from "@/components/layout/header";
import { useORPC } from "@/orpc/react";
import { ApiConfigCard, usePbxSetup, WebhookConfigCard } from "./_components";

export default function PbxSetupPage() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();

  const {
    // Webhook
    webhookUrl,
    webhookSecret,
    webhookSecretLoading,

    // API Config
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    baseUrlError,
    setBaseUrlError,
    apiKeyError,
    setApiKeyError,
    configSaved,
    setConfigSaved,

    // Mutations
    testAndSaveMutationPending,

    // Handlers
    handleCopy,
    handleTestAndSave,
  } = usePbxSetup();

  const updateSetupProgressMutation = useMutation(
    orpc.workspaces.updateSetupProgress.mutationOptions({
      onSuccess: () => {
        if (activeWorkspace) {
          queryClient.invalidateQueries({
            queryKey: orpc.workspaces.getSetupProgress.key(),
          });
        }
      },
    }),
  );

  const handleNext = async () => {
    // Сохраняем прогресс перед переходом
    if (activeWorkspace && configSaved) {
      try {
        await updateSetupProgressMutation.mutateAsync({
          workspaceId: activeWorkspace.id,
          completedStep: "api",
        });
      } catch (error) {
        console.error("Не удалось сохранить прогресс настройки:", error);
      }
    }
    router.push(paths.setup.directory);
  };

  return (
    <>
      <Header user={null} />

      <main className="main-content">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(paths.setup.root)}
              aria-label="Назад к настройке"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Подключение API телефонии</h1>
              <p className="text-muted-foreground">
                Настройте интеграцию с вашей телефонной системой
              </p>
            </div>
          </div>

          <WebhookConfigCard
            webhookUrl={webhookUrl}
            webhookSecret={webhookSecret}
            webhookSecretLoading={webhookSecretLoading}
            onCopy={handleCopy}
          />

          <ApiConfigCard
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            apiKey={apiKey}
            setApiKey={setApiKey}
            baseUrlError={baseUrlError}
            setBaseUrlError={setBaseUrlError}
            apiKeyError={apiKeyError}
            setApiKeyError={setApiKeyError}
            configSaved={configSaved}
            setConfigSaved={setConfigSaved}
            testAndSaveMutationPending={testAndSaveMutationPending}
            onTestAndSave={handleTestAndSave}
          />

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push(paths.setup.root)}
              className="min-h-[44px] min-w-[44px]"
            >
              <ArrowLeft className="mr-2 size-4" />
              Назад
            </Button>
            <Button
              onClick={handleNext}
              disabled={!configSaved || updateSetupProgressMutation.isPending}
              className="min-h-[44px] min-w-[44px]"
            >
              Далее
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
