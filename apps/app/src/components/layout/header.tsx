"use client";

import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import type { User } from "@/lib/auth";

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const { activeWorkspace } = useWorkspace();
  const isWorkspaceAdmin =
    activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

  if (!user) return null;

  return (
    <header className="top-header">
      <div className="user-profile">
        <div className="profile-info mr-1">
          <div className="profile-name text-sm font-bold text-gray-900">
            {user.name || user.username}
          </div>
          <div className="profile-role text-xs text-gray-500 font-extrabold text-right tracking-wide">
            {isWorkspaceAdmin ? "АДМИНИСТРАТОР" : "МЕНЕДЖЕР"}
          </div>
        </div>
        <div className="profile-avatar bg-gray-50 border border-gray-200 text-gray-700 font-semibold">
          {(user.name || user.username)[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
