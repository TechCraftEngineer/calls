"use client";

import { Button, Input, PasswordInput, toast } from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useORPC } from "@/orpc/react";

const apiCredentialsSchema = z.object({
  baseUrl: z.string().min(1, "Base URL обязателен").url("Введите корректный URL"),
  apiKey: z.string().min(1, "API Key обязателен"),
});

type ApiCredentialsFormData = z.infer<typeof apiCredentialsSchema>;

export default function ApiStepPage() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string>("");

  const testPbxMutation = useMutation(orpc.settings.testPbx.mutationOptions());
  const updatePbxAccessMutation = useMutation(
    orpc.settings.updatePbxAccess.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.settings.getIntegrations.queryKey({}) });
      },
    }),
  );

  const form = useForm<ApiCredentialsFormData>({
    resolver: zodResolver(apiCredentialsSchema),
    defaultValues: {
      baseUrl: "",
      apiKey: "",
    },
  });

  const handleTestConnection = async () => {
    const values = form.getValues();
    if (!values.baseUrl || !values.apiKey) {
      toast.error("Заполните все поля");
      return;
    }

    setTesting(true);
    setTestMessage("");

    try {
      const result = await testPbxMutation.mutateAsync({
        baseUrl: values.baseUrl.trim(),
        apiKey: values.apiKey.trim(),
      });

      const ok = Boolean(result?.success);

      if (ok) {
        setTestMessage("Подключение к MegaPBX успешно");
        toast.success("Подключение успешно");

        // Save the credentials
        await updatePbxAccessMutation.mutateAsync({
          enabled: true,
          baseUrl: values.baseUrl.trim(),
          apiKey: values.apiKey.trim(),
        });

        // Navigate to next step
        router.push("/setup/directory");
      } else {
        const errorMsg =
          result && typeof result === "object" && "error" in result
            ? String(result.error)
            : "Проверка не пройдена";
        setTestMessage(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Не удалось проверить подключение";
      setTestMessage(msg);
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const handleSkip = () => {
    router.push("/setup/directory");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Подключение к API</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Введите данные для подключения к API Мегафон MegaPBX
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Base URL</label>
          <Input
            {...form.register("baseUrl")}
            placeholder="https://vats919602.megapbx.ru/crmapi/v1"
            type="url"
            autoComplete="url"
          />
          {form.formState.errors.baseUrl && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.baseUrl.message}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">URL API из личного кабинета MegaPBX</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">API Key</label>
          <PasswordInput
            {...form.register("apiKey")}
            placeholder="sk-012345…"
            autoComplete="one-time-code"
          />
          {form.formState.errors.apiKey && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.apiKey.message}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Ключ API из раздела интеграций MegaPBX
          </p>
        </div>

        {testMessage && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              testMessage.includes("успешно")
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {testMessage}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing}
            className="flex-1"
          >
            {testing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Проверить подключение
          </Button>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={handleSkip}>
          Настроить позже
        </Button>
      </div>
    </div>
  );
}
