"use client";

import { paths } from "@calls/config";
import {
  Button,
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  Input,
  RadioGroup,
  RadioGroupItem,
  toast,
} from "@calls/ui";
import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

function getInviteUrl(
  inviteUrl: string | undefined,
  token: string | undefined,
): string {
  if (inviteUrl) return inviteUrl;
  if (!token || typeof window === "undefined") return "";
  const base = window.location.origin;
  return `${base}${paths.invite.byToken(token)}`;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  member: "Участник",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Может управлять участниками и настройками рабочего пространства",
  member: "Может просматривать и работать с контентом",
};

interface InviteUserModalProps {
  onClose: () => void;
  onSubmit: (
    email: string,
    role: "admin" | "member",
  ) => Promise<{ token: string; inviteUrl: string; expiresAt: Date }>;
}

export default function InviteUserModal({
  onClose,
  onSubmit,
}: InviteUserModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    email: string;
    inviteUrl: string;
    expiresAt: Date;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    if (!result) {
      emailInputRef.current?.focus();
    }
  }, [result]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Введите email получателя");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Введите корректный email адрес");
      return;
    }

    setSubmitting(true);
    try {
      const inviteResult = await onSubmit(trimmed, role);
      setResult({
        email: trimmed,
        inviteUrl: getInviteUrl(inviteResult.inviteUrl, inviteResult.token),
        expiresAt: inviteResult.expiresAt,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось отправить приглашение. Попробуйте позже.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!result?.inviteUrl) return;

    const showSuccess = () => {
      setCopied(true);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopied(false), 2000);
    };

    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = result.inviteUrl;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const ok = document.execCommand("copy");
        if (ok) showSuccess();
        else toast.error("Не удалось скопировать");
      } catch {
        toast.error("Не удалось скопировать");
      }
      document.body.removeChild(textarea);
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.inviteUrl);
        showSuccess();
      } else {
        fallbackCopy();
      }
    } catch {
      fallbackCopy();
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const formatExpiryDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (result) {
    return (
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-success-title"
      >
        <div
          ref={modalRef}
          className="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 flex flex-col gap-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"
                aria-hidden="true"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="text-green-600"
                >
                  <path
                    d="M16.667 5L7.5 14.167 3.333 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h2
                  id="invite-success-title"
                  className="text-xl font-bold text-gray-900 m-0"
                >
                  Приглашение отправлено
                </h2>
                <p className="text-sm text-gray-600 mt-1 m-0">
                  Email отправлен на <strong>{result.email}</strong>
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              aria-label="Закрыть"
              className="shrink-0"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 5L5 15M5 5l10 10" />
              </svg>
            </Button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <label
              htmlFor="invite-link"
              className="block text-xs font-semibold text-gray-700 mb-2"
            >
              Ссылка для приглашения
            </label>
            <div className="flex min-w-0 gap-2">
              <Input
                id="invite-link"
                type="text"
                value={result.inviteUrl}
                readOnly
                className="min-w-0 flex-1 font-mono text-sm text-gray-900 bg-white"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyLink}
                className="shrink-0 min-w-[44px]"
                aria-label="Скопировать ссылку"
              >
                {copied ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-green-600"
                  >
                    <path
                      d="M13.333 4L6 11.333 2.667 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="5" y="5" width="9" height="9" rx="1" />
                    <path d="M3 11V3a1 1 0 011-1h8" />
                  </svg>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 m-0">
              Действительна до {formatExpiryDate(result.expiresAt)}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-sm text-blue-900 m-0">
              <strong>Что дальше?</strong> Получатель перейдёт по ссылке,
              создаст аккаунт и автоматически получит доступ к рабочему
              пространству. Вы также можете скопировать ссылку и отправить её
              любым удобным способом.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setResult(null);
                setEmail("");
                setRole("member");
              }}
              className="flex-1 text-foreground"
            >
              Пригласить ещё
            </Button>
            <Button
              type="button"
              variant="dark"
              onClick={handleClose}
              className="flex-1"
            >
              Готово
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2
            id="invite-modal-title"
            className="text-xl font-bold text-gray-900 m-0"
          >
            Пригласить участника
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClose}
            aria-label="Закрыть"
            disabled={submitting}
            className="min-w-[44px]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 5L5 15M5 5l10 10" />
            </svg>
          </Button>
        </div>

        <p className="text-sm text-gray-600 m-0">
          Отправьте приглашение по email. Получатель создаст аккаунт и
          автоматически присоединится к рабочему пространству.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2"
              role="alert"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="shrink-0 mt-0.5"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="invite-email"
              className="text-sm font-semibold text-gray-700"
            >
              Email адрес
            </label>
            <Input
              ref={emailInputRef}
              id="invite-email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              autoComplete="email"
              spellCheck={false}
              required
              disabled={submitting}
              aria-describedby={error ? "email-error" : undefined}
              className="text-base"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-700">Роль</span>
            <RadioGroup
              value={role}
              onValueChange={(v) => {
                if (v === "admin" || v === "member") {
                  setRole(v);
                }
              }}
              className="w-fit"
              disabled={submitting}
            >
              <Field orientation="horizontal">
                <RadioGroupItem value="member" id="invite-role-member" />
                <FieldContent>
                  <FieldLabel
                    htmlFor="invite-role-member"
                    className="font-normal"
                  >
                    {ROLE_LABELS.member}
                  </FieldLabel>
                  <FieldDescription>
                    {ROLE_DESCRIPTIONS.member}
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem value="admin" id="invite-role-admin" />
                <FieldContent>
                  <FieldLabel
                    htmlFor="invite-role-admin"
                    className="font-normal"
                  >
                    {ROLE_LABELS.admin}
                  </FieldLabel>
                  <FieldDescription>{ROLE_DESCRIPTIONS.admin}</FieldDescription>
                </FieldContent>
              </Field>
            </RadioGroup>
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              type="button"
              variant="link"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 text-foreground"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="dark"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? "Отправка…" : "Отправить приглашение"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
