"use client";

import { paths } from "@calls/config";
import Link from "next/link";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import type { User } from "@/lib/auth";

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const { activeWorkspace } = useWorkspace();
  const isWorkspaceAdmin =
    activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

  return (
    <nav className="top-bar">
      <div className="brand">
        <Link href={paths.dashboard.root} className="brand-link">
          <div className="logo">M</div>
        </Link>
        <div className="brand-info">
          <div className="brand-title">QBS Звонки</div>
          <div className="brand-subtitle">Аналитика звонков</div>
        </div>
      </div>

      <div className="nav-links flex gap-6 ml-12 flex-1">
        <Link href={paths.dashboard.root} className="nav-link font-medium">
          Панель
        </Link>
        <Link
          href={paths.statistics.root}
          className="nav-link font-medium opacity-60"
        >
          Статистика
        </Link>
        {isWorkspaceAdmin && (
          <>
            <Link
              href={paths.users.root}
              className="nav-link font-medium opacity-60"
            >
              Пользователи
            </Link>
            <Link
              href={paths.settings.root}
              className="nav-link font-medium opacity-60"
            >
              Настройки
            </Link>
          </>
        )}
      </div>

      {user && (
        <div className="user-meta flex items-center gap-4">
          <div className="text-right">
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
          </div>
          <Link
            href={paths.auth.signout}
            className="bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded cursor-pointer text-xs hover:bg-white/20 transition-colors no-underline inline-block"
          >
            Выйти
          </Link>
        </div>
      )}
    </nav>
  );
}
