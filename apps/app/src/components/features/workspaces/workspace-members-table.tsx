"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
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
import type { WorkspaceMember } from "@/lib/api-orpc";

const ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  member: "Участник",
};

function formatDate(dateStr?: string | Date): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return "—";
  }
}

interface WorkspaceMembersTableProps {
  members: WorkspaceMember[];
  currentUserId: string | null;
  currentUserRole: string | null;
  loading: boolean;
  onRemoveMember: (userId: string) => void;
  onUpdateRole: (userId: string, role: "owner" | "admin" | "member") => void;
}

export default function WorkspaceMembersTable({
  members,
  currentUserId,
  currentUserRole,
  loading,
  onRemoveMember,
  onUpdateRole,
}: WorkspaceMembersTableProps) {
  const isOwner = currentUserRole === "owner";

  return (
    <Card className="card mb-6">
      <CardHeader className="p-0 pb-3">
        <div className="section-title flex items-center gap-2">
          <span className="text-base">Участники</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table className="op-table">
          <TableHeader>
            <TableRow className="border-none">
              <TableHead>ИМЯ</TableHead>
              <TableHead>EMAIL</TableHead>
              <TableHead>РОЛЬ</TableHead>
              <TableHead>ДАТА ДОБАВЛЕНИЯ</TableHead>
              <TableHead className="text-right">ДЕЙСТВИЯ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  Загрузка…
                </TableCell>
              </TableRow>
            ) : members.length > 0 ? (
              members.map((m) => {
                const isCurrentUser = currentUserId === m.userId;
                const canRemove =
                  !isCurrentUser &&
                  (currentUserRole === "owner" ||
                    (currentUserRole === "admin" && m.role !== "owner"));
                const canChangeRole =
                  isOwner && !isCurrentUser && m.role !== "owner";

                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-semibold text-[#333]">
                      {m.user?.name || m.user?.username || "—"}
                    </TableCell>
                    <TableCell className="text-[#555]">
                      {m.user?.email || "—"}
                    </TableCell>
                    <TableCell>
                      {canChangeRole ? (
                        <Select
                          value={m.role}
                          onValueChange={(
                            value: "owner" | "admin" | "member",
                          ) => onUpdateRole(m.userId, value)}
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
                          {ROLE_LABELS[m.role] ?? m.role}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#555]">
                      {formatDate(m.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-3 justify-end items-center">
                        {isCurrentUser ? (
                          <span className="text-[11px] text-[#999] font-semibold uppercase tracking-wide">
                            ЭТО ВЫ
                          </span>
                        ) : canRemove ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/80"
                            onClick={() => onRemoveMember(m.userId)}
                          >
                            Удалить
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-[#999]"
                >
                  Нет участников
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
