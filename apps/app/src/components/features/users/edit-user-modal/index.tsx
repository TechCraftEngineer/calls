"use client";

import { Button, toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { editUserFormSchema } from "@/lib/validations";
import { useORPC } from "@/orpc/react";
import {
  type EditUserForm,
  modalBoxClasses,
  modalOverlayClasses,
  type WorkspaceMemberUser,
} from "../types";
import { BasicFields } from "./basic-fields";
import { KpiFilterSection } from "./kpi-filter-section";
import { MaxSection } from "./max-section";
import { ReportSettingsSection } from "./report-settings-section";
import { TelegramSection } from "./telegram-section";

interface EditUserModalProps {
  user: WorkspaceMemberUser;
  onClose: () => void;
  onSubmit: (userId: string, form: EditUserForm) => Promise<void>;
  onRefresh: () => void;
}

function toBool(v: unknown): boolean {
  return v === true || v === false ? v : false;
}
function toNum(v: unknown): number {
  return typeof v === "number" ? v : 0;
}
function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function buildEditForm(u: WorkspaceMemberUser): EditUserForm {
  const ext = u as unknown as Record<string, unknown>;
  return {
    givenName: u.givenName ?? "",
    familyName: u.familyName ?? "",
    internalExtensions: u.internalExtensions ?? "",
    mobilePhones: u.mobilePhones ?? "",
    telegramChatId: u.telegramChatId ?? "",
    telegramDailyReport: toBool(u.telegramDailyReport ?? ext.telegram_daily_report),
    telegramManagerReport: toBool(u.telegramManagerReport ?? ext.telegram_manager_report),
    maxChatId: u.maxChatId ?? toStr(ext.max_chat_id) ?? "",
    maxDailyReport: toBool(u.maxDailyReport ?? ext.max_daily_report),
    maxManagerReport: toBool(u.maxManagerReport ?? ext.max_manager_report),
    filterExcludeAnsweringMachine: toBool(
      u.filterExcludeAnsweringMachine ?? ext.filter_exclude_answering_machine,
    ),
    filterMinDuration: toNum(u.filterMinDuration ?? ext.filter_min_duration),
    filterMinReplicas: toNum(u.filterMinReplicas ?? ext.filter_min_replicas),
    email: u.email ?? "",
    emailDailyReport: toBool(u.emailDailyReport ?? ext.email_daily_report),
    emailWeeklyReport: toBool(u.emailWeeklyReport ?? ext.email_weekly_report),
    emailMonthlyReport: toBool(u.emailMonthlyReport ?? ext.email_monthly_report),
    telegramWeeklyReport: toBool(u.telegramWeeklyReport ?? ext.telegram_weekly_report),
    telegramMonthlyReport: toBool(u.telegramMonthlyReport ?? ext.telegram_monthly_report),
    kpiBaseSalary: toNum(u.kpiBaseSalary ?? ext.kpi_base_salary),
    kpiTargetBonus: toNum(u.kpiTargetBonus ?? ext.kpi_target_bonus),
    kpiTargetTalkTimeMinutes: toNum(u.kpiTargetTalkTimeMinutes ?? ext.kpi_target_talk_time_minutes),
    evaluationTemplateSlug: (() => {
      const raw = toStr(ext.evaluation_template_slug);
      const validValues = ["sales", "support", "general"];
      return validValues.includes(raw) ? raw : "general";
    })(),
    evaluationCustomInstructions:
      u.evaluationCustomInstructions ?? toStr(ext.evaluation_custom_instructions) ?? "",
  };
}

function validateForm(form: EditUserForm): string | null {
  const result = editUserFormSchema.safeParse({
    givenName: form.givenName,
    email: form.email ?? "",
    filterMinDuration: form.filterMinDuration,
    filterMinReplicas: form.filterMinReplicas,
    kpiBaseSalary: form.kpiBaseSalary,
    kpiTargetBonus: form.kpiTargetBonus,
    kpiTargetTalkTimeMinutes: form.kpiTargetTalkTimeMinutes,
  });
  if (result.success) return null;
  const first = result.error.issues[0];
  return first?.message ?? "Ошибка валидации";
}

export default function EditUserModal({ user, onClose, onSubmit, onRefresh }: EditUserModalProps) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EditUserForm>(() => buildEditForm(user));
  const [editUser, setEditUser] = useState<WorkspaceMemberUser>(user);
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
        updateForm({ maxChatId: "" });
        setEditUser((u) => ({ ...u, maxChatId: "" }));
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
      const errorMessage = err instanceof Error ? err.message : "Ошибка при сохранении";
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
      onSuccess: (res: { url?: string; manual_instruction?: string; token?: string }) => {
        const url = "url" in res ? res.url : undefined;
        if (typeof url === "string") {
          window.open(url, "_blank");
        } else if (res.manual_instruction) {
          const cmd = res.manual_instruction.split(": ")[1] ?? res.manual_instruction;
          toast.info(`Для подключения отправьте боту команду:\n${cmd}`);
        }
      },
      onError: () => toast.error("Ошибка при создании ссылки для MAX"),
    }),
  );

  const handleDisconnectTelegram = useCallback(() => {
    if (!confirm("Отвязать Telegram аккаунт?")) return;
    void disconnectTelegramMutation.mutate({ userId: String(editUser.id) });
  }, [editUser.id, disconnectTelegramMutation]);

  const handleConnectTelegram = useCallback(() => {
    void telegramAuthUrlMutation.mutate({ userId: String(editUser.id) });
  }, [editUser.id, telegramAuthUrlMutation]);

  const handleCheckTelegramConnection = useCallback(async () => {
    try {
      const list = await queryClient.fetchQuery(orpc.users.list.queryOptions());
      const arr = (Array.isArray(list) ? list : []) as WorkspaceMemberUser[];
      const updated = arr.find((u) => String(u.id) === String(editUser.id));
      if (updated) {
        setEditUser(updated);
        const ext = updated as unknown as Record<string, unknown>;
        updateForm({
          telegramChatId: updated.telegramChatId ?? "",
          filterExcludeAnsweringMachine: toBool(
            updated.filterExcludeAnsweringMachine ?? ext.filter_exclude_answering_machine,
          ),
          filterMinDuration: toNum(updated.filterMinDuration ?? ext.filter_min_duration),
          filterMinReplicas: toNum(updated.filterMinReplicas ?? ext.filter_min_replicas),
        });
        onRefresh();
      }
    } catch (_e) {
      toast.error("Ошибка при проверке подключения");
    }
  }, [editUser.id, onRefresh, queryClient, orpc.users.list, updateForm]);

  const handleDisconnectMax = useCallback(() => {
    if (!confirm("Отвязать MAX аккаунт?")) return;
    void disconnectMaxMutation.mutate({ userId: String(editUser.id) });
  }, [editUser.id, disconnectMaxMutation]);

  const handleConnectMax = useCallback(() => {
    void maxAuthUrlMutation.mutate({ userId: String(editUser.id) });
  }, [editUser.id, maxAuthUrlMutation]);

  return (
    <div className={modalOverlayClasses} onClick={onClose}>
      <div className={modalBoxClasses} onClick={(e) => e.stopPropagation()}>
        <h2 className="m-0 mb-5 text-lg font-bold">Редактировать пользователя</h2>
        <p className="m-0 mb-4 text-[13px] text-[#666]">Email: {String(editUser.email ?? "")}</p>

        <form onSubmit={handleSubmit}>
          {error ? <p className="text-[#c00] mb-3 text-sm">{String(error)}</p> : null}

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
            <Button type="button" variant="link" onClick={onClose} className="text-foreground">
              Отмена
            </Button>
            <Button type="submit" variant="default" disabled={submitting}>
              {submitting ? (
                <>
                  <span
                    className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden
                  />
                  Сохранить
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
