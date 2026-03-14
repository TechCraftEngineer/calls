"use client";

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
import type { User } from "@/lib/auth";
import type { ManagedUser } from "./types";

interface UsersTableProps {
  users: ManagedUser[];
  currentUser: User | null;
  loading: boolean;
  onEdit: (user: ManagedUser) => void;
  onChangePassword: (user: ManagedUser) => void;
  onDelete: (userId: number, username: string) => void;
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
  onEdit,
  onChangePassword,
  onDelete,
}: UsersTableProps) {
  return (
    <Card className="card p-0! overflow-hidden">
      <CardContent className="p-0!">
        <Table className="op-table">
          <TableHeader>
            <TableRow className="border-none">
              <TableHead>ID</TableHead>
              <TableHead>ИМЯ ПОЛЬЗОВАТЕЛЯ</TableHead>
              <TableHead>ИМЯ</TableHead>
              <TableHead>ФАМИЛИЯ</TableHead>
              <TableHead>ВНУТР. НОМЕРА</TableHead>
              <TableHead>МОБИЛЬНЫЕ НОМЕРА</TableHead>
              <TableHead>ДАТА СОЗДАНИЯ</TableHead>
              <TableHead className="text-right">ДЕЙСТВИЯ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10">
                  Загрузка…
                </TableCell>
              </TableRow>
            ) : users.length > 0 ? (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-[#999] font-medium">
                    {u.id}
                  </TableCell>
                  <TableCell className="font-semibold text-[#333]">
                    {u.username}
                  </TableCell>
                  <TableCell className="text-[#555]">
                    {u.givenName || "—"}
                  </TableCell>
                  <TableCell className="text-[#555]">
                    {u.familyName || "—"}
                  </TableCell>
                  <TableCell className="text-[#555] font-medium">
                    {u.internalExtensions || "—"}
                  </TableCell>
                  <TableCell className="text-[#555] font-medium">
                    {u.mobilePhones || "—"}
                  </TableCell>
                  <TableCell className="text-[#555]">
                    {formatDate(u.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-3 justify-end items-center">
                      <Button
                        variant="outline"
                        className="ghost-btn h-8 text-xs px-4 bg-white border-[#DDD] text-[#333] font-semibold"
                        onClick={() => onEdit(u)}
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="outline"
                        className="ghost-btn h-8 text-xs px-4 bg-white border-[#DDD] text-[#333] font-semibold"
                        onClick={() => onChangePassword(u)}
                      >
                        Пароль
                      </Button>
                      <div className="w-20 flex justify-end items-center">
                        {currentUser?.id === u.id ? (
                          <span className="text-[11px] text-[#999] font-semibold uppercase tracking-wide">
                            ЭТО ВЫ
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            className="h-8 text-xs p-0 bg-transparent border-none text-[#FF5252] font-semibold hover:opacity-70"
                            onClick={() => onDelete(u.id, u.username)}
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
                <TableCell
                  colSpan={9}
                  className="text-center py-10 text-[#999]"
                >
                  Нет данных
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
