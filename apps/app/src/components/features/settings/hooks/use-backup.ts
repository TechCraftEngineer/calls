"use client";

import { toast } from "@calls/ui";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { useORPC } from "@/orpc/react";
import type { SettingsState } from "../types";

interface UseBackupSettingsProps {
  state: {
    backupLoading: boolean;
  };
  setState: React.Dispatch<React.SetStateAction<SettingsState>>;
}

export function useBackupSettings({ state, setState }: UseBackupSettingsProps) {
  const orpc = useORPC();
  const backupInFlightRef = useRef(false);

  const backupMutation = useMutation(orpc.settings.backup.mutationOptions());

  const handleBackup = async () => {
    // Защищаемся от повторного клика, пока запрос ещё не дошёл до setState.
    if (backupInFlightRef.current || state.backupLoading) return;
    backupInFlightRef.current = true;
    try {
      setState((prev: SettingsState) => ({ ...prev, backupLoading: true }));
      const res = await backupMutation.mutateAsync(undefined);
      const path = res?.path ?? "";
      const message =
        res?.message ??
        "Резервная копия: выполните pg_dump $POSTGRES_URL > backup.sql";
      toast.info(
        `Запрос на резервную копию зарегистрирован.\n${message}${
          path ? `\nФайл: ${path}` : ""
        }`,
      );
    } catch (error: unknown) {
      const msg =
        (error instanceof Error ? error.message : String(error)) ||
        "Не удалось создать резервную копию";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setState((prev: SettingsState) => ({ ...prev, backupLoading: false }));
      backupInFlightRef.current = false;
    }
  };

  return {
    handleBackup,
  };
}
