"use client";

import { toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useORPC } from "@/orpc/react";
import type { AccessFormData, SyncOptionsFormData, WebhookFormData } from "../megapbx/schemas";
import type { MegaPbxSettings, PbxEmployeeItem, PbxNumberItem, SettingsState } from "../types";

// После запуска синхронизации справочника MegaPBX он обновляется не мгновенно.
// Делаем короткую паузу перед рефетчем списков, чтобы они успели появиться в БД.
const DIRECTORY_SYNC_REFETCH_DELAY_MS = 5000;

interface MegaPbxSettingsState {
  megaPbx: MegaPbxSettings;
  megaPbxSaving: boolean;
  megaPbxAccessSaving: boolean;
  megaPbxSyncOptionsSaving: boolean;
  megaPbxExcludedNumbersSaving: boolean;
  megaPbxWebhookSaving: boolean;
  megaPbxTesting: boolean;
  megaPbxSyncing: "directory" | "calls" | null;
  megaPbxTestMessage: string;
  megaPbxEmployeesLoading: boolean;
  megaPbxNumbersLoading: boolean;
  megaPbxEmployees: PbxEmployeeItem[];
  megaPbxNumbers: PbxNumberItem[];
}

interface UseMegaPbxSettingsProps {
  state: MegaPbxSettingsState;
  setState: React.Dispatch<React.SetStateAction<SettingsState>>;
}

export function useMegaPbxSettings({ state, setState }: UseMegaPbxSettingsProps) {
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const invalidatePbx = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: orpc.settings.getPbx.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.settings.getIntegrations.queryKey(),
    });
  }, [orpc, queryClient]);

  const updatePbxMutation = useMutation(
    orpc.settings.updatePbx.mutationOptions({ onSuccess: invalidatePbx }),
  );
  const updatePbxAccessMutation = useMutation(
    orpc.settings.updatePbxAccess.mutationOptions({ onSuccess: invalidatePbx }),
  );
  const updatePbxSyncOptionsMutation = useMutation(
    orpc.settings.updatePbxSyncOptions.mutationOptions({
      onSuccess: invalidatePbx,
    }),
  );
  const updatePbxExcludedNumbersMutation = useMutation(
    orpc.settings.updatePbxExcludedNumbers.mutationOptions({
      onSuccess: invalidatePbx,
    }),
  );
  const updatePbxWebhookMutation = useMutation(
    orpc.settings.updatePbxWebhook.mutationOptions({
      onSuccess: invalidatePbx,
    }),
  );
  const testPbxMutation = useMutation(orpc.settings.testPbx.mutationOptions());
  const syncPbxDirectoryMutation = useMutation(
    orpc.settings.syncPbxDirectory.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxEmployees.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxNumbers.queryKey(),
        });
      },
    }),
  );
  const syncPbxCallsMutation = useMutation(
    orpc.settings.syncPbxCalls.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getPbx.queryKey(),
        });
      },
    }),
  );
  const refetchPbxLists = useCallback(async () => {
    const [employees, numbers] = await Promise.all([
      queryClient.fetchQuery(orpc.settings.listPbxEmployees.queryOptions()),
      queryClient.fetchQuery(orpc.settings.listPbxNumbers.queryOptions()),
    ]);
    setState((prev: SettingsState) => ({
      ...prev,
      megaPbxEmployees: employees as PbxEmployeeItem[],
      megaPbxNumbers: numbers as PbxNumberItem[],
    }));
  }, [orpc, queryClient, setState]);

  const linkPbxUserMutation = useMutation(
    orpc.settings.linkPbxUser.mutationOptions({
      onSuccess: refetchPbxLists,
    }),
  );
  const unlinkPbxUserMutation = useMutation(
    orpc.settings.unlinkPbxUser.mutationOptions({
      onSuccess: refetchPbxLists,
    }),
  );

  const megaPbxPayload = () => ({
    excludePhoneNumbers: (state.megaPbx.excludePhoneNumbers ?? "")
      .split(/[\n,;]+/)
      .map((value) => value.replace(/\D/g, ""))
      .filter(Boolean),
    enabled: state.megaPbx.enabled,
    baseUrl: state.megaPbx.baseUrl,
    apiKey: state.megaPbx.apiKey,
    syncFromDate: state.megaPbx.syncFromDate.trim(),
    webhookSecret: state.megaPbx.webhookSecret,
    ftpHost: state.megaPbx.ftpHost,
    ftpUser: state.megaPbx.ftpUser,
    ftpPassword: state.megaPbx.ftpPassword,
    syncEmployees: state.megaPbx.syncEmployees,
    syncNumbers: state.megaPbx.syncNumbers,
    syncCalls: state.megaPbx.syncCalls,
    syncRecordings: state.megaPbx.syncRecordings,
    webhooksEnabled: state.megaPbx.webhooksEnabled,
  });

  const refreshPbxSettings = useCallback(async () => {
    const [megaPbx, megaPbxEmployees, megaPbxNumbers] = await Promise.all([
      queryClient.fetchQuery(orpc.settings.getPbx.queryOptions()),
      queryClient.fetchQuery(orpc.settings.listPbxEmployees.queryOptions()),
      queryClient.fetchQuery(orpc.settings.listPbxNumbers.queryOptions()),
    ]);

    setState((prev: SettingsState) => ({
      ...prev,
      megaPbx: {
        enabled: megaPbx.enabled,
        baseUrl: megaPbx.baseUrl ?? "",
        apiKey: "",
        apiKeySet: megaPbx.apiKeySet,
        syncFromDate: megaPbx.syncFromDate ?? "",
        excludePhoneNumbers: Array.isArray(megaPbx.excludePhoneNumbers)
          ? megaPbx.excludePhoneNumbers.join("\n")
          : "",
        webhookSecret: "",
        webhookSecretSet: megaPbx.webhookSecretSet,
        ftpHost: megaPbx.ftpHost ?? "",
        ftpUser: megaPbx.ftpUser ?? "",
        ftpPassword: "",
        ftpPasswordSet: megaPbx.ftpPasswordSet,
        syncEmployees: megaPbx.syncEmployees,
        syncNumbers: megaPbx.syncNumbers,
        syncCalls: megaPbx.syncCalls,
        syncRecordings: megaPbx.syncRecordings,
        webhooksEnabled: megaPbx.webhooksEnabled,
      },
      megaPbxEmployees: megaPbxEmployees as PbxEmployeeItem[],
      megaPbxNumbers: megaPbxNumbers as PbxNumberItem[],
    }));
  }, [orpc, queryClient, setState]);

  const handleSavePbx = async () => {
    try {
      setState((prev: SettingsState) => ({ ...prev, megaPbxSaving: true }));
      await updatePbxMutation.mutateAsync(megaPbxPayload());
      await refreshPbxSettings();
      toast.success("MegaPBX настройки сохранены");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Не удалось сохранить настройки MegaPBX";
      toast.error(msg);
    } finally {
      setState((prev: SettingsState) => ({ ...prev, megaPbxSaving: false }));
    }
  };

  const handleSavePbxAccess = async (payload: AccessFormData) => {
    try {
      setState((prev: SettingsState) => ({
        ...prev,
        megaPbxAccessSaving: true,
      }));
      await updatePbxAccessMutation.mutateAsync({
        enabled: state.megaPbx.enabled,
        baseUrl: payload.baseUrl.trim(),
        apiKey: payload.apiKey?.trim() || undefined,
        syncFromDate: payload.syncFromDate?.trim() || undefined,
      });
      await refreshPbxSettings();
      toast.success("Доступ к API сохранён");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Не удалось сохранить доступ к API";
      toast.error(msg);
    } finally {
      setState((prev: SettingsState) => ({
        ...prev,
        megaPbxAccessSaving: false,
      }));
    }
  };

  const handleSavePbxSyncOptions = async (payload: SyncOptionsFormData) => {
    try {
      setState((prev: SettingsState) => ({
        ...prev,
        megaPbxSyncOptionsSaving: true,
      }));
      await updatePbxSyncOptionsMutation.mutateAsync(payload);
      await refreshPbxSettings();
      toast.success("Настройки синхронизации сохранены");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Не удалось сохранить настройки синхронизации";
      toast.error(msg);
      throw error;
    } finally {
      setState((prev: SettingsState) => ({
        ...prev,
        megaPbxSyncOptionsSaving: false,
      }));
    }
  };

  const handleSavePbxExcludedNumbers = async (excludePhoneNumbers: string[]) => {
    try {
      setState((prev: SettingsState) => ({
        ...prev,
        megaPbxExcludedNumbersSaving: true,
      }));
      const normalized = Array.from(
        new Set(excludePhoneNumbers.map((value) => value.replace(/\D/g, "")).filter(Boolean)),
      );
      await updatePbxExcludedNumbersMutation.mutateAsync({
        excludePhoneNumbers: normalized,
      });
      setState((prev: SettingsState) => ({
        ...prev,
        megaPbx: {
          ...prev.megaPbx,
          excludePhoneNumbers: normalized.join("\n"),
        },
      }));
      await refreshPbxSettings();
      toast.success("Исключённые номера сохранены");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Не удалось сохранить исключённые номера";
      toast.error(msg);
    } finally {
      setState((prev: SettingsState) => ({
        ...prev,
        megaPbxExcludedNumbersSaving: false,
      }));
    }
  };

  const handleSavePbxWebhook = async (payload: WebhookFormData) => {
    try {
      setState((prev: SettingsState) => ({
        ...prev,
        megaPbxWebhookSaving: true,
      }));
      const trimmedSecret = payload.webhookSecret?.trim();
      await updatePbxWebhookMutation.mutateAsync(
        trimmedSecret ? { webhookSecret: trimmedSecret } : {},
      );
      await refreshPbxSettings();
      toast.success("Webhook сохранён");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Не удалось сохранить webhook";
      toast.error(msg);
    } finally {
      setState((prev: SettingsState) => ({
        ...prev,
        megaPbxWebhookSaving: false,
      }));
    }
  };

  const handleTestPbx = async (baseUrl?: string, apiKey?: string) => {
    const url = baseUrl ?? state.megaPbx.baseUrl;
    const key = apiKey ?? state.megaPbx.apiKey;
    try {
      setState((prev: SettingsState) => ({
        ...prev,
        megaPbxTesting: true,
        megaPbxTestMessage: "",
      }));
      const result = await testPbxMutation.mutateAsync({
        baseUrl: url,
        apiKey: key,
      });
      const ok =
        result !== null &&
        typeof result === "object" &&
        "success" in result &&
        result.success === true;
      const failText = (() => {
        if (!result || typeof result !== "object") {
          return "Неизвестный ответ сервера";
        }
        if ("error" in result && typeof result.error === "string") {
          return result.error.trim() || "Проверка не пройдена";
        }
        if ("message" in result && typeof (result as { message?: unknown }).message === "string") {
          const m = (result as { message: string }).message.trim();
          return m || "Проверка не пройдена";
        }
        return ok ? "" : "Проверка не пройдена";
      })();
      const message = ok ? "Подключение к MegaPBX успешно" : failText;
      setState((prev: SettingsState) => ({
        ...prev,
        megaPbxTestMessage: message,
      }));
      if (ok) toast.success(message);
      else toast.error(message);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Не удалось проверить подключение к MegaPBX";
      setState((prev: SettingsState) => ({ ...prev, megaPbxTestMessage: msg }));
      toast.error(msg);
    } finally {
      setState((prev: SettingsState) => ({ ...prev, megaPbxTesting: false }));
    }
  };

  const runPbxSync = async (type: "directory" | "calls") => {
    try {
      setState((prev: SettingsState) => ({ ...prev, megaPbxSyncing: type }));
      if (type === "directory") {
        await syncPbxDirectoryMutation.mutateAsync(undefined);
      } else {
        await syncPbxCallsMutation.mutateAsync(undefined);
      }
      const message =
        type === "directory"
          ? "Синхронизация справочника MegaPBX поставлена в очередь"
          : "Синхронизация звонков и записей MegaPBX поставлена в очередь";
      toast.success(message);
      if (type === "directory") {
        setTimeout(() => {
          refetchPbxLists().catch(() => {});
        }, DIRECTORY_SYNC_REFETCH_DELAY_MS);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Ошибка синхронизации MegaPBX";
      toast.error(msg);
    } finally {
      setState((prev: SettingsState) => ({ ...prev, megaPbxSyncing: null }));
    }
  };

  const handleLinkPbxTarget = async (input: {
    targetType: "employee" | "number";
    targetExternalId: string;
    userId?: string | null;
    invitationId?: string | null;
  }) => {
    await linkPbxUserMutation.mutateAsync(input);
  };

  const handleUnlinkPbxTarget = async (input: {
    targetType: "employee" | "number";
    targetExternalId: string;
  }) => {
    await unlinkPbxUserMutation.mutateAsync(input);
  };

  const setMegaPbxEnabled = (checked: boolean) => {
    setState((prev: SettingsState) => ({
      ...prev,
      megaPbx: { ...prev.megaPbx, enabled: checked },
    }));
    const runUpdate = async () => {
      try {
        setState((prev: SettingsState) => ({ ...prev, megaPbxSaving: true }));
        await updatePbxMutation.mutateAsync({
          ...megaPbxPayload(),
          enabled: checked,
        });
        toast.success(checked ? "Интеграция включена" : "Интеграция выключена");
      } catch (error) {
        setState((prev: SettingsState) => ({
          ...prev,
          megaPbx: { ...prev.megaPbx, enabled: !checked },
        }));
        const msg = error instanceof Error ? error.message : "Не удалось обновить интеграцию";
        toast.error(msg);
      } finally {
        setState((prev: SettingsState) => ({ ...prev, megaPbxSaving: false }));
      }
    };
    return runUpdate();
  };

  return {
    handleSavePbx,
    handleSavePbxAccess,
    handleSavePbxSyncOptions,
    handleSavePbxExcludedNumbers,
    handleSavePbxWebhook,
    handleTestPbx,
    handleSyncPbxDirectory: () => runPbxSync("directory"),
    handleSyncPbxCalls: () => runPbxSync("calls"),
    handleLinkPbxTarget,
    handleUnlinkPbxTarget,
    handleSaveMegaPbx: handleSavePbx,
    handleTestMegaPbx: handleTestPbx,
    handleSyncMegaPbxDirectory: () => runPbxSync("directory"),
    handleSyncMegaPbxCalls: () => runPbxSync("calls"),
    handleLinkMegaPbxTarget: handleLinkPbxTarget,
    handleUnlinkMegaPbxTarget: handleUnlinkPbxTarget,
    setMegaPbxEnabled,
  };
}
