"use client";

import { paths } from "@calls/config";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@/lib/auth";

interface SidebarProps {
  user: User | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const icons = {
    dashboard: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-orange-500"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    statistics: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-blue-600"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    users: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-purple-600"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    settings: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-600"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    logout: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-500"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  };

  return (
    <aside className="sidebar">
      <Link
        href={paths.dashboard.root}
        className="sidebar-logo"
        title="QBS Звонки"
      >
        M
      </Link>
      <nav className="w-full flex flex-col gap-2">
        <Link
          href={paths.dashboard.root}
          className={`nav-item ${pathname === paths.dashboard.root ? "is-active" : ""}`}
          title="Звонки"
        >
          <div className="icon-bubble bg-orange-50">{icons.dashboard}</div>
        </Link>
        <Link
          href={paths.statistics.root}
          className={`nav-item ${pathname === paths.statistics.root ? "is-active" : ""}`}
          title="Статистика"
        >
          <div className="icon-bubble bg-blue-50">{icons.statistics}</div>
        </Link>
        {(user?.role === "admin" ||
          user?.username === "admin@mango" ||
          user?.username === "admin@gmail.com") && (
          <>
            <Link
              href={paths.users.root}
              className={`nav-item ${pathname === paths.users.root ? "is-active" : ""}`}
              title="Пользователи"
            >
              <div className="icon-bubble bg-purple-50">{icons.users}</div>
            </Link>
            <Link
              href={paths.settings.root}
              className={`nav-item ${pathname === paths.settings.root ? "is-active" : ""}`}
              title="Настройки"
            >
              <div className="icon-bubble bg-gray-50">{icons.settings}</div>
            </Link>
          </>
        )}
      </nav>
      <div className="mt-auto flex flex-col gap-3 items-center">
        <Link href={paths.auth.signout} className="nav-item" title="Выход">
          <div className="icon-bubble">{icons.logout}</div>
        </Link>
      </div>
    </aside>
  );
}
