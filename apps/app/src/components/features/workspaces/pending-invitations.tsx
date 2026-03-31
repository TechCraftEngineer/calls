"use client";

import { Button, Card, CardContent } from "@calls/ui";
import { useState } from "react";

// Функция для русской множественной формы
const formatRussianPlural = (count: number, forms: [string, string, string]): string => {
  const tens = Math.floor((count % 100) / 10);
  const ones = count % 10;

  if (tens === 1) return forms[2]; // 11-14
  if (ones === 1) return forms[0]; // 1
  if (ones >= 2 && ones <= 4) return forms[1]; // 2-4
  return forms[2]; // 5-9, 0
};

interface PendingInvitation {
  id: string;
  email: string | null;
  role: string;
  createdAt?: Date;
  expiresAt?: Date;
  pendingSettings?: unknown;
  invitationType?: "email" | "link";
}

interface PendingInvitationsProps {
  invitations: PendingInvitation[];
  onRevoke: (invitationId: string) => void;
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
    const hoursUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24 && hoursUntilExpiry > 0;
  };

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card className="mt-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 m-0">Ожидают подтверждения</h3>
          <span className="text-sm text-gray-500">
            {invitations.length}{" "}
            {formatRussianPlural(invitations.length, ["приглашение", "приглашения", "приглашений"])}
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
                    {inv.email ?? "Ссылка-приглашение"}
                  </p>
                  {inv.invitationType === "link" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      По ссылке
                    </span>
                  )}
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
                  {inv.createdAt && <span>Отправлено {formatDate(inv.createdAt)}</span>}
                  {inv.expiresAt && <span>· Истекает {formatDate(inv.expiresAt)}</span>}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmRevoke(inv.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[36px]"
                    aria-label={`Отменить приглашение для ${inv.email ?? "ссылки"}`}
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
            Приглашения действительны 7 дней. После принятия пользователь автоматически получит
            доступ к компании.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
