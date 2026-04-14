"use client";

import { toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useORPC } from "@/orpc/react";

export interface UsePbxMutationsReturn {
  testAndSaveMutationPending: boolean;
  syncMutationPending: boolean;
  importMutationPending: boolean;
  handleTestAndSave: (
    baseUrl: string,
    apiKey: string,
    webhookSecret: string,
    onSuccess?: () => void,
  ) => void;
  handleSync: () => void;
  handleImport: (
    selectedEmployees: Set<string>,
    selectedNumbers: Set<string>,
    onSuccess: () => void,
  ) => Promise<void>;
  resetPaginationOnSync: () => void;
}

export function usePbxMutations(
  validateConfig: () => boolean,
  focusFirstError: () => void,
): UsePbxMutationsReturn {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();

  // Base mutations
  const testPbxMutation = useMutation(orpc.settings.testPbx.mutationOptions());
  const updatePbxAccessMutation = useMutation(orpc.settings.updatePbxAccess.mutationOptions());
  const updatePbxWebhookMutation = useMutation(orpc.settings.updatePbxWebhook.mutationOptions());
  const syncPbxDirectoryMutation = useMutation(orpc.settings.syncPbxDirectory.mutationOptions());
  const importPbxDirectoryMutation = useMutation(
    orpc.settings.importPbxDirectory.mutationOptions(),
  );

  const testAndSaveMutation = useMutation({
    mutationFn: async (params: { baseUrl: string; apiKey: string; webhookSecret: string }) => {
      const idempotencyKey = `test-and-save-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const result = await testPbxMutation.mutateAsync({
        baseUrl: params.baseUrl.trim(),
        apiKey: params.apiKey.trim(),
        idempotencyKey,
      });
      if (result && typeof result === "object" && "success" in result && result.success) {
        await updatePbxAccessMutation.mutateAsync({
          enabled: true,
          baseUrl: params.baseUrl.trim(),
          apiKey: params.apiKey.trim(),
        });
        await updatePbxWebhookMutation.mutateAsync({
          webhookSecret: params.webhookSecret,
        });
        return true;
      }
      throw new Error("Проверка не пройдена");
    },
    onSuccess: async () => {
      // Инвалидируем кеш интеграций чтобы useAutoCompleteSteps получил обновлённые данные
      await queryClient.invalidateQueries({
        queryKey: orpc.settings.getIntegrations.queryKey({}),
      });

      // Обновляем прогресс настройки - добавляем шаг "api"
      if (activeWorkspace) {
        try {
          await queryClient
            .getMutationCache()
            .build(queryClient, orpc.workspaces.updateSetupProgress.mutationOptions())
            .execute({
              workspaceId: activeWorkspace.id,
              completedStep: "api",
            });

          // Инвалидируем кеш прогресса
          await queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] === "workspaces.getSetupProgress",
          });
        } catch (error) {
          console.error("Не удалось обновить прогресс настройки:", error);
        }
      }

      toast.success("API подключено");
    },
    onError: () => {
      toast.error("Не удалось подключиться к API");
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const result = await syncPbxDirectoryMutation.mutateAsync({});
      return result;
    },
    onSuccess: async (result) => {
      // Синхронизация завершена, обновляем данные
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxEmployees.queryKey({}),
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxNumbers.queryKey({}),
        }),
      ]);

      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(error.message || "Ошибка синхронизации");
    },
  });

  const handleTestAndSave = useCallback(
    (baseUrl: string, apiKey: string, webhookSecret: string, onSuccess?: () => void) => {
      if (!validateConfig()) {
        focusFirstError();
        return;
      }
      testAndSaveMutation.mutate(
        { baseUrl, apiKey, webhookSecret },
        {
          onSuccess: () => {
            onSuccess?.();
          },
        },
      );
    },
    [testAndSaveMutation, validateConfig, focusFirstError],
  );

  const handleSync = useCallback(() => {
    syncMutation.mutate();
  }, [syncMutation]);

  const handleImport = useCallback(
    async (selectedEmployees: Set<string>, selectedNumbers: Set<string>, onSuccess: () => void) => {
      if (importPbxDirectoryMutation.isPending) {
        return;
      }

      if (selectedEmployees.size === 0 && selectedNumbers.size === 0) {
        toast.error("Выберите хотя бы одного сотрудника или номер для импорта");
        return;
      }

      try {
        const result = await importPbxDirectoryMutation.mutateAsync({
          employeeIds: Array.from(selectedEmployees),
          numberIds: Array.from(selectedNumbers),
        });

        // Очищаем кэш справочников после успешного импорта
        await queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxEmployees.queryKey({}),
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxNumbers.queryKey({}),
        });

        toast.success(
          `Импортировано ${result.importedEmployees} сотрудников и ${result.importedNumbers} номеров`,
        );
        onSuccess();
      } catch {
        toast.error("Ошибка при импорте. Попробуйте снова.");
      }
    },
    [importPbxDirectoryMutation, queryClient, orpc],
  );

  return {
    testAndSaveMutationPending: testAndSaveMutation.isPending,
    syncMutationPending: syncMutation.isPending,
    importMutationPending: importPbxDirectoryMutation.isPending,
    handleTestAndSave,
    handleSync,
    handleImport,
    resetPaginationOnSync: () => {},
  };
}
