"use client";

import { toast } from "@calls/ui";
import { useMutation } from "@tanstack/react-query";
import { useORPC } from "@/orpc/react";

interface UseBackupSettingsProps {
  state: {
    backupLoading: boolean;
  };
  setState: React.Dispatch<React.SetStateAction<any>>;
}

export function useBackupSettings({ state, setState }: UseBackupSettingsProps) {
  const orpc = useORPC();

  const backupMutation = useMutation(orpc.settings.backup.mutationOptions());

  const handleBackup = async () => {
    if (state.backupLoading) return;
    try {
      setState((prev: any) => ({ ...prev, backupLoading: true }));
      const res = await backupMutation.mutateAsync(undefined);
      const path = res?.path ?? "";
      toast.success(`Резервная копия создана: ${path}`);
    } catch (error: unknown) {
      const msg =
        (error instanceof Error ? error.message : String(error)) ||
        "Не удалось создать резервную копию";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setState((prev: any) => ({ ...prev, backupLoading: false }));
    }
  };

  return {
    handleBackup,
  };
}
