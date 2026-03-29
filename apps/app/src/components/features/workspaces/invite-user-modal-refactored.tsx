"use client";

import { toast } from "@calls/ui";
import { useEffect, useState } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

import InviteForm from "./invite-form";
import InviteSuccess from "./invite-success";

interface InviteUserModalProps {
  onClose: () => void;
  onSubmit: (
    email: string,
    role: "admin" | "member",
  ) => Promise<{ token: string; inviteUrl: string; expiresAt: Date }>;
  onCreateLink: (
    role: "admin" | "member",
  ) => Promise<{ token: string; inviteUrl: string; expiresAt: Date }>;
}

interface InviteResult {
  email?: string;
  inviteUrl: string;
  isLinkInvite: boolean;
  expiresAt: Date;
}

export default function InviteUserModal({
  onClose,
  onSubmit,
  onCreateLink,
}: InviteUserModalProps) {
  const [result, setResult] = useState<InviteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleClose = () => {
    if (!isLoading) {
      setResult(null);
      onClose();
    }
  };

  const handleEmailSubmit = async (email: string, role: "admin" | "member") => {
    setIsLoading(true);
    try {
      const inviteResult = await onSubmit(email, role);
      setResult({
        email,
        inviteUrl: inviteResult.inviteUrl,
        isLinkInvite: false,
        expiresAt: inviteResult.expiresAt,
      });
      toast.success("Приглашение отправлено");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось отправить приглашение",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkCreate = async (role: "admin" | "member") => {
    setIsLoading(true);
    try {
      const inviteResult = await onCreateLink(role);
      setResult({
        inviteUrl: inviteResult.inviteUrl,
        isLinkInvite: true,
        expiresAt: inviteResult.expiresAt,
      });
      toast.success("Ссылка-приглашение создана");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось создать ссылку",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl p-8 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {result ? (
          <InviteSuccess
            email={result.email}
            inviteUrl={result.inviteUrl}
            isLinkInvite={result.isLinkInvite}
            onClose={handleClose}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <div>
                <h1
                  id="modal-title"
                  className="text-xl font-bold text-gray-900 m-0"
                >
                  Пригласить в компанию
                </h1>
                <p
                  id="modal-description"
                  className="text-sm text-gray-600 mt-1 m-0"
                >
                  Добавьте нового участника или создайте ссылку для
                  присоединения
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="shrink-0 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
                aria-label="Закрыть"
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
              </button>
            </div>

            <InviteForm
              onSubmit={handleEmailSubmit}
              onCreateLink={handleLinkCreate}
              onClose={handleClose}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
