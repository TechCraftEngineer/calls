"use client";

import { Button, Card, CardContent } from "@calls/ui";
import { useState } from "react";

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  createdAt?: Date;
  expiresAt?: Date;
  pendingSettings?: unknown;
}

interface PendingInvitationsProps {
  invitations: PendingInvitation[];
  onRevoke: (invitationId: string) => void;
  onConfigureSettings?: (invitationId: string, email: string) => void;
  isRevoking?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  member: "Участник",
  owner: "Владелец",
};

export default function PendingInvitations({
  invitations,
  onRevoke,
  onConfigureSettings,
  isRevoking = false,
}: PendingInvitationsProps) {
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const isExpiringSoon = (expiresAt?: Date) => {
    if (!expiresAt) return false;
    const now = new Date();
    const expires = new Date(expiresAt);
    const hoursUntilExpiry =
      (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24 && hoursUntilExpiry > 0;
  };

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card className="mt-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 m-0">
            Ожидают подтверждения
          </h3>
          <span className="text-sm text-gray-500">
            {invitations.length}{" "}
            {invitations.length === 1 ? "приглашение" : "приглашений"}
          </span>
        </div>

        <div className="space-y-3">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate m-0">
                    {inv.email}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {ROLE_LABELS[inv.role] ?? inv.role}
                  </span>
                  {isExpiringSoon(inv.expiresAt) && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"
                      title="Истекает в течение 24 часов"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="currentColor"
                        className="mr-1"
                      >
                        <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm0 10a4 4 0 110-8 4 4 0 010 8zm-.5-6.5v3l2 1.5.5-.8-1.5-1.2V3.5h-1z" />
                      </svg>
                      Скоро истечёт
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {inv.createdAt && (
                    <span>Отправлено {formatDate(inv.createdAt)}</span>
                  )}
                  {inv.expiresAt && (
                    <span>· Истекает {formatDate(inv.expiresAt)}</span>
                  )}
                </div>
              </div>

              {confirmRevoke === inv.id ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmRevoke(null)}
                    disabled={isRevoking}
                    className="min-h-[36px]"
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onRevoke(inv.id);
                      setConfirmRevoke(null);
                    }}
                    disabled={isRevoking}
                    className="min-h-[36px]"
                  >
                    {isRevoking ? "Отмена…" : "Подтвердить"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {onConfigureSettings && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onConfigureSettings(inv.id, inv.email)}
                      className="min-h-[36px]"
                      aria-label={`Настроить параметры для ${inv.email}`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="mr-1"
                        aria-hidden="true"
                      >
                        <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z" />
                        <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 002.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 001.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 00-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 00-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 00-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 002.8 8.99l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 003.915 4.44l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 002.692-1.115l.094-.319z" />
                      </svg>
                      Настроить
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmRevoke(inv.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[36px]"
                    aria-label={`Отменить приглашение для ${inv.email}`}
                  >
                    Отменить
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-900 m-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="currentColor"
              className="inline mr-1 -mt-0.5"
            >
              <path d="M7 0a7 7 0 100 14A7 7 0 007 0zm0 11a1 1 0 110-2 1 1 0 010 2zm1-3.5v.5a1 1 0 01-2 0v-1a1 1 0 011-1 1.5 1.5 0 10-1.5-1.5 1 1 0 01-2 0 3.5 3.5 0 115 3.5z" />
            </svg>
            Приглашения действительны 7 дней. После принятия пользователь
            автоматически получит доступ к workspace.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
