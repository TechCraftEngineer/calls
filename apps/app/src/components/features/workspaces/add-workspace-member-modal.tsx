"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@calls/ui";
import { useState } from "react";
import type { UserAvailableToAdd } from "@/lib/api-orpc";

const ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  member: "Участник",
};

interface AddWorkspaceMemberModalProps {
  users: UserAvailableToAdd[];
  existingMembers?: { id: string; name: string; email: string }[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (
    userId: string,
    role: "owner" | "admin" | "member",
  ) => Promise<void>;
}

export default function AddWorkspaceMemberModal({
  users,
  existingMembers = [],
  loading,
  onClose,
  onSubmit,
}: AddWorkspaceMemberModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<
    "owner" | "admin" | "member"
  >("member");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!selectedUserId) {
      setError("Выберите пользователя");
      return;
    }
    
    // Проверяем, что пользователь еще не является участником
    const isAlreadyMember = existingMembers.some(member => member.id === selectedUserId);
    if (isAlreadyMember) {
      setError("Этот пользователь уже является участником воркспейса");
      return;
    }
    
    setSubmitting(true);
    try {
      await onSubmit(selectedUserId, selectedRole);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Не удалось добавить участника",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 m-0">
            Добавить участника
          </h2>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors border-none cursor-pointer"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#999]">
            Загрузка пользователей…
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500 m-0">
            Нет пользователей, которых можно добавить. Все зарегистрированные
            пользователи уже в воркспейсе.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[13px] font-medium">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-gray-700">
                Пользователь
              </label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите пользователя" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.username} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-gray-700">
                Роль
              </label>
              <Select
                value={selectedRole}
                onValueChange={(v: "owner" | "admin" | "member") =>
                  setSelectedRole(v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                  <SelectItem value="member">{ROLE_LABELS.member}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={onClose}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-[2] h-11 rounded-lg border-none bg-[#111] text-sm font-semibold text-white hover:bg-gray-800 transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={submitting}
              >
                {submitting ? "Добавление…" : "Добавить"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
