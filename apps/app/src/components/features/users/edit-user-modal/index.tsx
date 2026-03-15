"use client";

import { Button, toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useORPC } from "@/orpc/react";
import {
  type EditUserForm,
  type ManagedUser,
  modalBoxClasses,
  modalOverlayClasses,
} from "../types";
import { BasicFields } from "./basic-fields";
import { KpiFilterSection } from "./kpi-filter-section";
import { MaxSection } from "./max-section";
import { ReportSettingsSection } from "./report-settings-section";
import { TelegramSection } from "./telegram-section";

interface EditUserModalProps {
  user: ManagedUser;
  onClose: () => void;
  onSubmit: (userId: string, form: EditUserForm) => Promise<void>;
  onRefresh: () => void;
}

function buildEditForm(u: ManagedUser): EditUserForm {
  return {
    givenName: u.givenName || "",
    familyName: u.familyName || "",
    internalExtensions: u.internalExtensions || "",
    mobilePhones: u.mobilePhones || "",
    telegramChatId: u.telegramChatId || "",
    telegram_daily_report: u.telegram_daily_report || false,
    telegram_manager_report: u.telegram_manager_report || false,
    max_chat_id: u.max_chat_id || "",
    max_daily_report: u.max_daily_report || false,
    max_manager_report: u.max_manager_report || false,
    filter_exclude_answering_machine:
      u.filter_exclude_answering_machine || false,
    filter_min_duration: u.filter_min_duration ?? 0,
    filter_min_replicas: u.filter_min_replicas ?? 0,
    email: u.email || "",
    email_daily_report: u.email_daily_report || false,
    email_weekly_report: u.email_weekly_report || false,
    email_monthly_report: u.email_monthly_report || false,
    telegram_weekly_report: u.telegram_weekly_report || false,
    telegram_monthly_report: u.telegram_monthly_report || false,
    report_include_call_summaries: u.report_include_call_summaries || false,
    report_detailed: u.report_detailed || false,
    report_include_avg_value: u.report_include_avg_value || false,
    report_include_avg_rating: u.report_include_avg_rating || false,
    kpi_base_salary: u.kpi_base_salary || 0,
    kpi_target_bonus: u.kpi_target_bonus || 0,
    kpi_target_talk_time_minutes: u.kpi_target_talk_time_minutes || 0,
    evaluation_template_slug: u.evaluation_template_slug ?? "general",
    evaluation_custom_instructions: u.evaluation_custom_instructions ?? "",
  };
}

function validateForm(form: EditUserForm): string | null {
  if (!form.givenName.trim()) {
    return "Укажите имя.";
  }

  if (form.email?.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      return "Укажите корректный email адрес.";
    }
  }

  if (form.filter_min_duration < 0) {
    return "Минимальная длительность звонка не может быть отрицательной.";
  }

  if (form.filter_min_replicas < 0) {
    return "Минимальное количество реплик не может быть отрицательным.";
  }

  return null;
}

export default function EditUserModal({
  user,
  onClose,
  onSubmit,
  onRefresh,
}: EditUserModalProps) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EditUserForm>(() => buildEditForm(user));
  const [editUser, setEditUser] = useState<ManagedUser>(user);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const updateForm = useCallback((updates: Partial<EditUserForm>) => {
    setForm((f) => ({ ...f, ...updates }));
  }, []);

  const disconnectTelegramMutation = useMutation(
    orpc.users.disconnectTelegram.mutationOptions({
      onSuccess: () => {
        updateForm({ telegramChatId: "" });
        setEditUser((u) => ({ ...u, telegramChatId: "" }));
        onRefresh();
        toast.success("Telegram отвязан");
      },
      onError: () => toast.error("Ошибка при отвязке Telegram"),
    }),
  );

  const disconnectMaxMutation = useMutation(
    orpc.users.disconnectMax.mutationOptions({
      onSuccess: () => {
        updateForm({ max_chat_id: "" });
        setEditUser((u) => ({ ...u, max_chat_id: "" }));
        onRefresh();
        toast.success("MAX отвязан");
      },
      onError: () => toast.error("Ошибка при отвязке MAX"),
    }),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(String(editUser.id), form);
      toast.success("Настройки пользователя сохранены");
      onClose();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Ошибка при сохранении";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const telegramAuthUrlMutation = useMutation(
    orpc.users.telegramAuthUrl.mutationOptions({
      onSuccess: (res: { url?: string }) => {
        if (res.url) {
          window.open(res.url, "_blank");
        }
      },
      onError: () => toast.error("Ошибка при создании ссылки для Telegram"),
    }),
  );

  const maxAuthUrlMutation = useMutation(
    orpc.users.maxAuthUrl.mutationOptions({
      onSuccess: (res: {
        url?: string;
        manual_instruction?: string;
        token?: string;
      }) => {
        const url = "url" in res ? res.url : undefined;
        if (typeof url === "string") {
          window.open(url, "_blank");
        } else if (res.manual_instruction) {
          const cmd =
            res.manual_instruction.split(": ")[1] ?? res.manual_instruction;
          toast.info(`Для подключения отправьте боту команду:\n${cmd}`);
        }
      },
      onError: () => toast.error("Ошибка при создании ссылки для MAX"),
    }),
  );

  const handleDisconnectTelegram = useCallback(() => {
    if (!confirm("Отвязать Telegram аккаунт?")) return;
    void disconnectTelegramMutation.mutate({ user_id: String(editUser.id) });
  }, [editUser.id, disconnectTelegramMutation]);

  const handleConnectTelegram = useCallback(() => {
    void telegramAuthUrlMutation.mutate({ user_id: String(editUser.id) });
  }, [editUser.id, telegramAuthUrlMutation]);

  const handleCheckTelegramConnection = useCallback(async () => {
    try {
      const list = await queryClient.fetchQuery(orpc.users.list.queryOptions());
      const arr = (Array.isArray(list) ? list : []) as ManagedUser[];
      const updated = arr.find((u) => String(u.id) === String(editUser.id));
      if (updated) {
        setEditUser(updated);
        updateForm({
          telegramChatId: updated.telegramChatId || "",
          filter_exclude_answering_machine:
            updated.filter_exclude_answering_machine || false,
          filter_min_duration: updated.filter_min_duration ?? 0,
          filter_min_replicas: updated.filter_min_replicas ?? 0,
        });
        onRefresh();
      }
    } catch (_e) {
      toast.error("Ошибка при проверке подключения");
    }
  }, [editUser.id, onRefresh, queryClient, orpc.users.list, updateForm]);

  const handleDisconnectMax = useCallback(() => {
    if (!confirm("Отвязать MAX аккаунт?")) return;
    void disconnectMaxMutation.mutate({ user_id: String(editUser.id) });
  }, [editUser.id, disconnectMaxMutation]);

  const handleConnectMax = useCallback(() => {
    void maxAuthUrlMutation.mutate({ user_id: String(editUser.id) });
  }, [editUser.id, maxAuthUrlMutation]);

  return (
    <div className={modalOverlayClasses} onClick={onClose}>
      <div className={modalBoxClasses} onClick={(e) => e.stopPropagation()}>
        <h2 className="m-0 mb-5 text-lg font-bold">
          Редактировать пользователя
        </h2>
        <p className="m-0 mb-4 text-[13px] text-[#666]">
          Логин: {String(editUser.username ?? "")}
        </p>

        <form onSubmit={handleSubmit}>
          {error ? (
            <p className="text-[#c00] mb-3 text-sm">{String(error)}</p>
          ) : null}

          <BasicFields form={form} onFormChange={updateForm} />

          <TelegramSection
            form={form}
            editUser={editUser}
            onFormChange={updateForm}
            onDisconnect={handleDisconnectTelegram}
            onConnect={handleConnectTelegram}
            onCheckConnection={handleCheckTelegramConnection}
          />

          <MaxSection
            form={form}
            editUser={editUser}
            onFormChange={updateForm}
            onDisconnect={handleDisconnectMax}
            onConnect={handleConnectMax}
          />

          <ReportSettingsSection form={form} onFormChange={updateForm} />

          <KpiFilterSection form={form} onFormChange={updateForm} />

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
