"use client";

import { compareIds } from "@calls/shared";
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calls/ui";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/auth";
import type { ManagedUser } from "./types";

const ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  member: "Участник",
};

const EVALUATION_TEMPLATE_LABELS: Record<string, string> = {
  sales: "Продажи",
  support: "Поддержка",
  general: "Общий",
};

interface UsersTableProps {
  users: ManagedUser[];
  currentUser: User | null;
  currentUserRole: string | null;
  loading: boolean;
  onRemoveMember: (userId: string, email: string) => void;
  onUpdateRole: (userId: string, role: "owner" | "admin" | "member") => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr.substring(0, 10).replace(/-/g, ".");
  }
}

export default function UsersTable({
  users,
  currentUser,
  currentUserRole,
  loading,
  onRemoveMember,
  onUpdateRole,
}: UsersTableProps) {
  const router = useRouter();
  const isOwner = currentUserRole === "owner";

  return (
    <Card className="card p-0! overflow-hidden">
      <CardContent className="p-0!">
        <Table className="op-table">
          <TableHeader>
            <TableRow className="border-none">
              <TableHead>Имя / Логин</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Шаблон оценки</TableHead>
              <TableHead>Внутр. номера</TableHead>
              <TableHead>Мобильные</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="animate-spin h-8 w-8 border-4 border-gray-200 border-t-orange-500 rounded-full"
                      aria-hidden="true"
                    />
                    <span className="text-gray-600">Загрузка…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length > 0 ? (
              users.map((u) => {
                const userId = u.userId ?? u.id;
                const isCurrentUser = compareIds(currentUser?.id, userId);
                const canChangeRole =
                  isOwner && !isCurrentUser && u.role !== "owner";
                const canRemove =
                  !isCurrentUser &&
                  (currentUserRole === "owner" ||
                    (currentUserRole === "admin" && u.role !== "owner"));

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold text-[#333]">
                      {u.givenName || u.familyName
                        ? [u.givenName, u.familyName]
                            .filter((x): x is string => !!x)
                            .join(" ")
                        : String(u.email ?? "")}
                      {u.email && (u.givenName || u.familyName) ? (
                        <span className="block text-xs text-[#999] font-normal">
                          {String(u.email)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {canChangeRole ? (
                        <Select
                          value={u.role ?? "member"}
                          onValueChange={(v: "owner" | "admin" | "member") =>
                            onUpdateRole(userId, v)
                          }
                        >
                          <SelectTrigger className="w-[160px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              {ROLE_LABELS.admin}
                            </SelectItem>
                            <SelectItem value="member">
                              {ROLE_LABELS.member}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-[#555]">
                          {ROLE_LABELS[String(u.role ?? "member")] ??
                            String(u.role ?? "member")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#555]">
                      {u.evaluation_template_slug
                        ? (EVALUATION_TEMPLATE_LABELS[
                            u.evaluation_template_slug
                          ] ?? u.evaluation_template_slug)
                        : "—"}
                    </TableCell>
                    <TableCell
                      className="text-[#555] font-medium"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {u.internalExtensions || "—"}
                    </TableCell>
                    <TableCell
                      className="text-[#555] font-medium"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {u.mobilePhones || "—"}
                    </TableCell>
                    <TableCell
                      className="text-[#555]"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatDate(u.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-3 justify-end items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="ghost-btn text-xs px-3 bg-white border-[#DDD] text-[#333] font-semibold hover:bg-gray-50"
                          onClick={() => router.push(`/users/${userId}/edit`)}
                          aria-label={`Редактировать ${u.email}`}
                        >
                          Настройки
                        </Button>
                        {isCurrentUser ? (
                          <span className="text-[11px] text-[#999] font-semibold uppercase tracking-wide">
                            Это вы
                          </span>
                        ) : canRemove ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/80"
                            onClick={() =>
                              onRemoveMember(
                                userId,
                                String(u.email ?? u.name ?? ""),
                              )
                            }
                            aria-label={`Исключить ${u.email}`}
                          >
                            Исключить
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-12 h-12 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <p className="text-[#999] font-medium">Нет участников</p>
                    <p className="text-[#BBB] text-sm">
                      Пригласите по email или добавьте существующего
                      пользователя
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
