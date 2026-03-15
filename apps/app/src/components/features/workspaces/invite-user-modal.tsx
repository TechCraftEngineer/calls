"use client";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@calls/ui";
import { useState } from "react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  member: "Участник",
};

const COPY_FEEDBACK_TIMEOUT = 2000;

interface InviteUserModalProps {
  onClose: () => void;
  onSubmit: (
    email: string,
    role: "admin" | "member",
  ) => Promise<{
    token: string;
    inviteUrl: string;
    expiresAt: Date;
  }>;
}

export default function InviteUserModal({
  onClose,
  onSubmit,
}: InviteUserModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Введите email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Некорректный email");
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit(trimmed, role);
      setInviteUrl(result.inviteUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось создать приглашение",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_TIMEOUT);
    } catch {
      setError("Не удалось скопировать ссылку");
    }
  };

  const handleSendEmail = () => {
    if (!inviteUrl || !email.trim()) return;
    const subject = encodeURIComponent("Приглашение в QBS Звонки");
    const body = encodeURIComponent(
      `Вас пригласили присоединиться к рабочему пространству QBS Звонки.\n\nПерейдите по ссылке, чтобы создать аккаунт и получить доступ:\n\n${inviteUrl}`,
    );
    window.open(`mailto:${email.trim()}?subject=${subject}&body=${body}`);
  };

  if (inviteUrl) {
    return (
      <div
        className="fixed inset-0 z-2000 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[440px] bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 flex flex-col gap-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 m-0">
              Приглашение создано
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
            >
              &times;
            </Button>
          </div>

          <p className="text-sm text-gray-600 m-0">
            Скопируйте ссылку и отправьте её на <strong>{email}</strong>. Новый
            пользователь перейдёт по ссылке, создаст аккаунт и получит доступ к
            рабочему пространству.
          </p>

          <div className="flex gap-2">
            <Input readOnly value={inviteUrl} className="font-mono text-xs" />
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "Скопировано" : "Копировать"}
            </Button>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSendEmail}>
              Открыть почту
            </Button>
            <Button variant="accent" onClick={onClose}>
              Готово
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-2000 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 m-0">
            Пригласить по email
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
          >
            &times;
          </Button>
        </div>

        <p className="text-sm text-gray-500 m-0">
          Введите email и выберите роль. После создания вы получите ссылку —
          отправьте её коллеге, он перейдёт по ссылке и зарегистрируется.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[13px] font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-gray-700">
              Email *
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-gray-700">
              Роль
            </label>
            <Select
              value={role}
              onValueChange={(v: "admin" | "member") => setRole(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent className="z-2100">
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                <SelectItem value="member">{ROLE_LABELS.member}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? "Отправка…" : "Отправить приглашение"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
