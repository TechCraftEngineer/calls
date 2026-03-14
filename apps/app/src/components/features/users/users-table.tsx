"use client";

import { compareIds, normalizeId } from "@calls/shared";
import {
  Button,
  Card,
  CardContent,
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

interface UsersTableProps {
  users: ManagedUser[];
  currentUser: User | null;
  loading: boolean;
  onChangePassword: (user: ManagedUser) => void;
  onDelete: (userId: string, username: string) => void;
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
  loading,
  onChangePassword,
  onDelete,
}: UsersTableProps) {
  const router = useRouter();

  return (
    <Card className="card p-0! overflow-hidden">
      <CardContent className="p-0!">
        <Table className="op-table">
          <TableHeader>
            <TableRow className="border-none">
              <TableHead>ID</TableHead>
              <TableHead>Имя пользователя</TableHead>
              <TableHead>Имя</TableHead>
              <TableHead>Фамилия</TableHead>
              <TableHead>Внутр. номера</TableHead>
              <TableHead>Мобильные номера</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
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
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell
                    className="text-[#999] font-medium"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {u.id}
                  </TableCell>
                  <TableCell className="font-semibold text-[#333]">
                    {String(u.username ?? "")}
                  </TableCell>
                  <TableCell className="text-[#555]">
                    {u.givenName || "—"}
                  </TableCell>
                  <TableCell className="text-[#555]">
                    {u.familyName || "—"}
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
                        className="ghost-btn h-10 text-xs px-4 bg-white border-[#DDD] text-[#333] font-semibold hover:bg-gray-50 transition-colors"
                        onClick={() => router.push(`/users/${u.id}/edit`)}
                        aria-label={`Редактировать пользователя ${u.username}`}
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="outline"
                        className="ghost-btn h-10 text-xs px-4 bg-white border-[#DDD] text-[#333] font-semibold hover:bg-gray-50 transition-colors"
                        onClick={() => onChangePassword(u)}
                        aria-label={`Изменить пароль пользователя ${u.username}`}
                      >
                        Пароль
                      </Button>
                      <div className="w-20 flex justify-end items-center">
                        {compareIds(currentUser?.id, u.id) ? (
                          <span className="text-[11px] text-[#999] font-semibold uppercase tracking-wide">
                            Это вы
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            className="h-10 text-xs p-0 bg-transparent border-none text-[#FF5252] font-semibold hover:opacity-70 transition-opacity"
                            onClick={() =>
                              onDelete(
                                normalizeId(u.id),
                                String(u.username ?? ""),
                              )
                            }
                            aria-label={`Удалить пользователя ${u.username}`}
                          >
                            Удалить
                          </Button>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
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
                    <p className="text-[#999] font-medium">Нет пользователей</p>
                    <p className="text-[#BBB] text-sm">
                      Добавьте первого пользователя, чтобы начать работу
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
