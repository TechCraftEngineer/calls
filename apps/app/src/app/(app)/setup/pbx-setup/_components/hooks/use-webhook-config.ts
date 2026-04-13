"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useORPC } from "@/orpc/react";

export interface UseWebhookConfigReturn {
  webhookUrl: string;
  webhookSecret: string;
  webhookSecretLoading: boolean;
}

export function useWebhookConfig(): UseWebhookConfigReturn {
  const orpc = useORPC();
  const { activeWorkspace } = useWorkspace();

  const webhookUrl = useMemo(() => {
    if (!activeWorkspace) return "";
    return `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/pbx/${activeWorkspace.id}`;
  }, [activeWorkspace]);

  const { data: webhookSecretData, isLoading: webhookSecretLoading } = useQuery({
    ...orpc.settings.getPbxWebhookSecret.queryOptions(),
    enabled: Boolean(activeWorkspace),
  });
  const webhookSecret = webhookSecretData?.webhookSecret ?? "";

  return {
    webhookUrl,
    webhookSecret,
    webhookSecretLoading,
  };
}
