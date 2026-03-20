"use client";

import { toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useORPC } from "@/orpc/react";
import type { FtpConnectionStatus, FtpSettings } from "../types";
import {
  validateFtpCredentials,
  validateFtpHost,
  validateFtpUser,
} from "../utils";

interface UseFtpSettingsProps {
  state: {
    ftp: FtpSettings;
    ftpSaving: boolean;
    ftpTesting: boolean;
    ftpTestMessage: string;
    ftpConnectionStatus: FtpConnectionStatus | null;
    ftpStatusLoading: boolean;
  };
  setState: React.Dispatch<React.SetStateAction<any>>;
}

export function useFtpSettings({ state, setState }: UseFtpSettingsProps) {
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const updateFtpMutation = useMutation(
    orpc.settings.updateFtp.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getIntegrations.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.settings.checkFtpStatus.queryKey(),
        });
      },
    }),
  );

  const testFtpMutation = useMutation(orpc.settings.testFtp.mutationOptions());

  const handleSaveFtp = async () => {
    try {
      setState((prev: any) => ({ ...prev, ftpSaving: true }));
      const { enabled, host, user, password, passwordSet } = state.ftp;

      if (host || user || password) {
        if (password.trim()) {
          const ftpValidation = validateFtpCredentials(host, user, password);
          if (!ftpValidation.isValid) {
            toast.error(ftpValidation.errors.join(". "));
            return;
          }
        } else if (passwordSet) {
          const hostValidation = validateFtpHost(host);
          const userValidation = validateFtpUser(user);
          const errors = [hostValidation.error, userValidation.error].filter(
            Boolean,
          );
          if (errors.length > 0) {
            toast.error(errors.join(". "));
            return;
          }
        } else {
          const ftpValidation = validateFtpCredentials(host, user, password);
          if (!ftpValidation.isValid) {
            toast.error(ftpValidation.errors.join(". "));
            return;
          }
        }
      }

      const syncFromDate = state.ftp.syncFromDate.trim();
      const excludeRaw = state.ftp.excludePhoneNumbers.trim();
      const excludePhoneNumbers = excludeRaw
        ? excludeRaw
            .split(/[\n,;]+/)
            .map((n) => n.trim())
            .filter(Boolean)
        : [];
      await updateFtpMutation.mutateAsync({
        enabled,
        host,
        user,
        password,
        syncFromDate:
          syncFromDate && /^\d{4}-\d{2}-\d{2}$/.test(syncFromDate)
            ? syncFromDate
            : undefined,
        excludePhoneNumbers,
      });
      toast.success("Параметры подключения FTP сохранены");
    } catch (error: unknown) {
      console.error("Failed to save FTP:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить параметры FTP";
      toast.error(msg);
    } finally {
      setState((prev: any) => ({ ...prev, ftpSaving: false }));
    }
  };

  const handleTestFtp = async () => {
    try {
      setState((prev: any) => ({
        ...prev,
        ftpTestMessage: "",
        ftpTesting: true,
      }));
      const { host, user, password, passwordSet } = state.ftp;

      if (passwordSet && !password.trim()) {
        setState((prev: any) => ({
          ...prev,
          ftpTestMessage: "Введите пароль для проверки подключения",
        }));
        return;
      }

      const ftpValidation = validateFtpCredentials(host, user, password);
      if (!ftpValidation.isValid) {
        setState((prev: any) => ({
          ...prev,
          ftpTestMessage: ftpValidation.errors.join(". "),
        }));
        return;
      }

      const result = await testFtpMutation.mutateAsync({
        host,
        user,
        password,
      });

      if (result.success) {
        setState((prev: any) => ({
          ...prev,
          ftpTestMessage: "Подключение установлено. Учётные данные корректны.",
          ftpConnectionStatus: {
            configured: true,
            success: true,
            message: "Подключено",
          },
        }));
      } else {
        setState((prev: any) => ({
          ...prev,
          ftpTestMessage: result.message,
          ftpConnectionStatus: {
            configured: true,
            success: false,
            message: result.message,
          },
        }));
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось проверить подключение";
      setState((prev: any) => ({
        ...prev,
        ftpTestMessage: msg,
      }));
    } finally {
      setState((prev: any) => ({ ...prev, ftpTesting: false }));
    }
  };

  const setFtpField =
    (key: "host" | "user" | "password" | "excludePhoneNumbers") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setState((prev: any) => ({
        ...prev,
        ftp: { ...prev.ftp, [key]: value },
      }));
    };

  const setFtpSyncFromDate = (value: string) => {
    setState((prev: any) => ({
      ...prev,
      ftp: { ...prev.ftp, syncFromDate: value },
    }));
  };

  const setFtpEnabled = (enabled: boolean) => {
    setState((prev: any) => ({
      ...prev,
      ftp: { ...prev.ftp, enabled },
    }));
  };

  return {
    handleSaveFtp,
    handleTestFtp,
    setFtpField,
    setFtpSyncFromDate,
    setFtpEnabled,
  };
}
