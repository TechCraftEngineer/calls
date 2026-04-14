"use client";

import { toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useORPC } from "@/orpc/react";
import type { Employee, PhoneNumber } from "../types";

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
  resetPagination: () => void,
): UsePbxMutationsReturn {
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Base mutations
  const testPbxMutation = useMutation(orpc.settings.testPbx.mutationOptions());
  const updatePbxAccessMutation = useMutation(orpc.settings.updatePbxAccess.mutationOptions());
  const updatePbxWebhookMutation = useMutation(orpc.settings.updatePbxWebhook.mutationOptions());
  const syncPbxDirectoryMutation = useMutation(orpc.settings.syncPbxDirectory.mutationOptions());
  const importPbxDirectoryMutation = useMutation(
    orpc.settings.importPbxDirectory.mutationOptions(),
  );

  // Get queries for sync polling (used to track initial state)
  useQuery(orpc.settings.listPbxEmployees.queryOptions({}));
  useQuery(orpc.settings.listPbxNumbers.queryOptions({}));

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
    onSuccess: () => {
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
    onSuccess: async () => {
      toast.info("Синхронизация поставлена в очередь. Ожидание завершения...");

      // Store initial counts to detect when sync completes
      const initialEmployees =
        queryClient.getQueryData<Employee[]>(orpc.settings.listPbxEmployees.queryKey()) ?? [];
      const initialNumbers =
        queryClient.getQueryData<PhoneNumber[]>(orpc.settings.listPbxNumbers.queryKey()) ?? [];
      const initialEmployeeCount = initialEmployees.length;
      const initialNumberCount = initialNumbers.length;

      // Clear any existing polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Poll for completion every 3 seconds
      pollIntervalRef.current = setInterval(async () => {
        try {
          // Fetch latest data
          const [employeesData, numbersData] = await Promise.all([
            queryClient.fetchQuery(orpc.settings.listPbxEmployees.queryOptions()),
            queryClient.fetchQuery(orpc.settings.listPbxNumbers.queryOptions()),
          ]);

          const employees = (employeesData ?? []) as Employee[];
          const numbers = (numbersData ?? []) as PhoneNumber[];

          // Check if data has changed (indicating sync completed)
          const currentEmployeesHash = JSON.stringify(
            employees
              .map((e) => ({
                id: e.id,
                displayName: e.displayName,
                extension: e.extension,
                isActive: e.isActive,
              }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          );
          const initialEmployeesHash = JSON.stringify(
            initialEmployees
              .map((e) => ({
                id: e.id,
                displayName: e.displayName,
                extension: e.extension,
                isActive: e.isActive,
              }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          );
          const currentNumbersHash = JSON.stringify(
            numbers
              .map((n) => ({
                id: n.id,
                phoneNumber: n.phoneNumber,
                extension: n.extension,
                label: n.label,
                lineType: n.lineType,
                isActive: n.isActive,
                employeeId: n.employee?.externalId ?? null,
              }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          );
          const initialNumbersHash = JSON.stringify(
            initialNumbers
              .map((n) => ({
                id: n.id,
                phoneNumber: n.phoneNumber,
                extension: n.extension,
                label: n.label,
                lineType: n.lineType,
                isActive: n.isActive,
                employeeId: n.employee?.externalId ?? null,
              }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          );
          const hasChanges =
            employees.length !== initialEmployeeCount ||
            numbers.length !== initialNumberCount ||
            currentEmployeesHash !== initialEmployeesHash ||
            currentNumbersHash !== initialNumbersHash;

          if (hasChanges) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            // Invalidate queries to refresh the UI
            await queryClient.invalidateQueries({
              queryKey: orpc.settings.listPbxEmployees.queryKey(),
            });
            await queryClient.invalidateQueries({
              queryKey: orpc.settings.listPbxNumbers.queryKey(),
            });

            resetPagination();

            toast.success("Синхронизация выполнена");
          }
        } catch {
          // Continue polling on error
        }
      }, 3000);

      // Stop polling after 5 minutes (max wait time)
      timeoutRef.current = setTimeout(
        () => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          toast.error(
            "Синхронизация не завершилась в течение 5 минут. Пожалуйста, попробуйте снова.",
          );
        },
        5 * 60 * 1000,
      );
    },
    onError: () => {
      toast.error("Ошибка синхронизации");
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
          queryKey: orpc.settings.listPbxEmployees.queryKey(),
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxNumbers.queryKey(),
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
    resetPaginationOnSync: resetPagination,
  };
}
