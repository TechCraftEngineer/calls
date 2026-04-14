import { toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { User } from "@/lib/auth";
import { useORPC } from "@/orpc/react";
import { getReportTypeLabel, type ReportType } from "../types";
import type { ReportSettingsForm } from "./report-settings-types";

interface UseReportSettingsMutationsProps {
  user: User;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
}

interface UseReportSettingsMutationsReturn {
  // Telegram connection state
  telegramAuthUrl: string | null;
  telegramConnectToken: string;
  telegramBotUsername: string | undefined;

  // Test messages state
  sendTestMessage: string;
  sendTestEmailMessage: string;

  // Loading states
  isSavingCombined: boolean;
  isSavingAny: boolean;

  // Mutation states - typed as any for simplicity (full oRPC typing is complex)
  // biome-ignore lint/suspicious/noExplicitAny: mutation types are inferred from oRPC
  telegramAuthUrlMutation: any;
  // biome-ignore lint/suspicious/noExplicitAny: mutation types are inferred from oRPC
  disconnectTelegramMutation: any;
  // biome-ignore lint/suspicious/noExplicitAny: mutation types are inferred from oRPC
  updateEmailMutation: any;
  // biome-ignore lint/suspicious/noExplicitAny: mutation types are inferred from oRPC
  updateTelegramMutation: any;
  // biome-ignore lint/suspicious/noExplicitAny: mutation types are inferred from oRPC
  updateMaxMutation: any;
  // biome-ignore lint/suspicious/noExplicitAny: mutation types are inferred from oRPC
  updateReportManagedUsersMutation: any;
  // biome-ignore lint/suspicious/noExplicitAny: mutation types are inferred from oRPC
  sendTestMutation: any;
  // biome-ignore lint/suspicious/noExplicitAny: mutation types are inferred from oRPC
  sendTestEmailMutation: any;

  // Actions
  handleTelegramConnect: () => void;
  handleTelegramDisconnect: () => void;
  handleSendTest: (reportType: ReportType) => void;
  handleSendTestEmail: (reportType: ReportType) => void;
  performUpdates: (params: {
    run: () => Promise<void>;
    successMessage: string;
    errorMessage: string;
    invalidateScheduleAfter?: boolean;
  }) => Promise<void>;
  invalidateUser: () => void;
  invalidateSchedule: () => void;
}

export function useReportSettingsMutations({
  user,
  setForm,
}: UseReportSettingsMutationsProps): UseReportSettingsMutationsReturn {
  const orpc = useORPC();
  const userId = String(user.id);
  const queryClient = useQueryClient();

  // Telegram connection state
  const [telegramAuthUrl, setTelegramAuthUrl] = useState<string | null>(null);
  const [telegramConnectToken, setTelegramConnectToken] = useState<string>("");

  // Test messages state
  const [sendTestMessage, setSendTestMessage] = useState("");
  const [sendTestEmailMessage, setSendTestEmailMessage] = useState("");

  // Saving state
  const [isSavingCombined, setIsSavingCombined] = useState(false);

  // Refs for timeouts and operation tracking
  const sendTestTelegramTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTestTelegramMessageRef = useRef("");
  const sendTestEmailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTestEmailMessageRef = useRef("");
  const saveOperationKeyRef = useRef("");

  const invalidateUser = () => {
    queryClient.invalidateQueries({
      queryKey: orpc.users.getForEdit.queryKey({ input: { userId: userId } }),
    });
  };

  const invalidateSchedule = () => {
    queryClient.invalidateQueries({
      queryKey: orpc.settings.getReportScheduleSettings.queryKey({}),
    });
  };

  const handleMutationError = (err: unknown, fallback: string) => {
    const msg = err instanceof Error ? err.message : fallback;
    toast.error(msg);
  };

  const telegramAuthUrlMutation = useMutation(
    orpc.users.telegramAuthUrl.mutationOptions({
      onMutate: () => {
        setTelegramAuthUrl("");
        setTelegramConnectToken("");
      },
      onSuccess: (res) => {
        if (res?.url) {
          setTelegramAuthUrl(res.url);
          const tokenMatch = res.url.match(/start=([^&]+)/);
          setTelegramConnectToken(tokenMatch?.[1] ?? "");
          toast.success("Выберите удобный способ подключения в открывшемся окне");
        } else {
          toast.error("Не удалось получить ссылку для подключения");
        }
      },
      onError: () => {
        setTelegramAuthUrl("");
        setTelegramConnectToken("");
        toast.error("Ошибка при создании ссылки для Telegram");
      },
    }),
  );

  const disconnectTelegramMutation = useMutation(
    orpc.users.disconnectTelegram.mutationOptions({
      onSuccess: () => {
        setForm((f) => ({ ...f, telegramChatId: "" }));
        toast.success("Telegram отвязан");
      },
      onError: () => toast.error("Ошибка при отвязке Telegram"),
    }),
  );

  const updateEmailMutation = useMutation(orpc.users.updateEmailSettings.mutationOptions());
  const updateTelegramMutation = useMutation(orpc.users.updateTelegramSettings.mutationOptions());
  const updateMaxMutation = useMutation(orpc.users.updateMaxSettings.mutationOptions());
  const updateReportManagedUsersMutation = useMutation(
    orpc.users.updateReportManagedUsersSettings.mutationOptions(),
  );

  const sendTestMutation = useMutation(
    orpc.reports.sendTestTelegram.mutationOptions({
      onSuccess: (_, variables) => {
        const reportType = variables.reportType;
        const reportTypeLabel = getReportTypeLabel(reportType);
        toast.success(`${reportTypeLabel} отчёт отправлен в Telegram`);
        const scheduledMsg = `${reportTypeLabel} отчёт отправлен`;
        setSendTestMessage(scheduledMsg);
        sendTestTelegramMessageRef.current = scheduledMsg;
        if (sendTestTelegramTimeoutRef.current != null)
          clearTimeout(sendTestTelegramTimeoutRef.current);
        sendTestTelegramTimeoutRef.current = setTimeout(() => {
          if (sendTestTelegramMessageRef.current === scheduledMsg) {
            setSendTestMessage("");
            sendTestTelegramMessageRef.current = "";
          }
        }, 4000);
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Не удалось отправить отчёт";
        toast.error(msg);
      },
    }),
  );

  const sendTestEmailMutation = useMutation(
    orpc.reports.sendTestEmail.mutationOptions({
      onSuccess: (_, variables) => {
        const reportTypeLabel = getReportTypeLabel(variables.reportType);
        const msg = `${reportTypeLabel} отчёт отправлен на email`;
        toast.success(msg);
        setSendTestEmailMessage(msg);
        sendTestEmailMessageRef.current = msg;
        if (sendTestEmailTimeoutRef.current != null) clearTimeout(sendTestEmailTimeoutRef.current);
        sendTestEmailTimeoutRef.current = setTimeout(() => {
          if (sendTestEmailMessageRef.current === msg) {
            setSendTestEmailMessage("");
            sendTestEmailMessageRef.current = "";
          }
        }, 4000);
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Не удалось отправить отчёт";
        toast.error(msg);
      },
    }),
  );

  const performUpdates = async ({
    run,
    successMessage,
    errorMessage,
    invalidateScheduleAfter = false,
  }: {
    run: () => Promise<void>;
    successMessage: string;
    errorMessage: string;
    invalidateScheduleAfter?: boolean;
  }) => {
    const operationKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;
    saveOperationKeyRef.current = operationKey;
    setIsSavingCombined(true);
    try {
      await run();
      toast.success(successMessage);
      invalidateUser();
      if (invalidateScheduleAfter) invalidateSchedule();
    } catch (err) {
      handleMutationError(err, errorMessage);
    } finally {
      if (saveOperationKeyRef.current === operationKey) {
        setIsSavingCombined(false);
      }
    }
  };

  const handleSendTest = (reportType: ReportType) => {
    sendTestMutation.mutate({ reportType });
  };

  const handleSendTestEmail = (reportType: ReportType) => {
    sendTestEmailMutation.mutate({ reportType });
  };

  const handleTelegramConnect = () => {
    telegramAuthUrlMutation.mutate({ userId: userId });
  };

  const handleTelegramDisconnect = () => {
    disconnectTelegramMutation.mutate({ userId: userId });
  };

  const telegramBotUsername = telegramAuthUrl
    ? telegramAuthUrl.replace("https://t.me/", "").split("?")[0]
    : undefined;

  const isSavingAny =
    isSavingCombined ||
    updateEmailMutation.isPending ||
    updateTelegramMutation.isPending ||
    updateMaxMutation.isPending ||
    updateReportManagedUsersMutation.isPending;

  return {
    telegramAuthUrl,
    telegramConnectToken,
    telegramBotUsername,
    sendTestMessage,
    sendTestEmailMessage,
    isSavingCombined,
    isSavingAny,
    telegramAuthUrlMutation,
    disconnectTelegramMutation,
    updateEmailMutation,
    updateTelegramMutation,
    updateMaxMutation,
    updateReportManagedUsersMutation,
    sendTestMutation,
    sendTestEmailMutation,
    handleTelegramConnect,
    handleTelegramDisconnect,
    handleSendTest,
    handleSendTestEmail,
    performUpdates,
    invalidateUser,
    invalidateSchedule,
  };
}
