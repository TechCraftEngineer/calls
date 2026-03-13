"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout, type User } from "@/lib/auth";

interface SidebarProps {
  user: User | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [useModernIcons, setUseModernIcons] = useState(true);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const icons = {
    dashboard: useModernIcons ? (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "#FF6B35" }}
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ) : (
      "📂"
    ),
    statistics: useModernIcons ? (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "#0061FF" }}
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ) : (
      "📊"
    ),
    users: useModernIcons ? (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "#722ED1" }}
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ) : (
      "👥"
    ),
    settings: useModernIcons ? (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "#555" }}
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ) : (
      "⚙️"
    ),
    logout: useModernIcons ? (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "#888" }}
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ) : (
      "⏻"
    ),
  };

  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="sidebar-logo" title="Mango Office">
        M
      </Link>
      <nav
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <Link
          href="/dashboard"
          className={`nav-item ${pathname === "/dashboard" ? "is-active" : ""}`}
          title="Звонки"
        >
          <div className="icon-bubble" style={{ background: "#FFF7E6" }}>
            {icons.dashboard}
          </div>
        </Link>
        <Link
          href="/statistics"
          className={`nav-item ${pathname === "/statistics" ? "is-active" : ""}`}
          title="Статистика"
        >
          <div className="icon-bubble" style={{ background: "#E6F4FF" }}>
            {icons.statistics}
          </div>
        </Link>
        {(user?.role === "admin" ||
          user?.username === "admin@mango" ||
          user?.username === "admin@gmail.com") && (
          <>
            <Link
              href="/users"
              className={`nav-item ${pathname === "/users" ? "is-active" : ""}`}
              title="Пользователи"
            >
              <div className="icon-bubble" style={{ background: "#F9F0FF" }}>
                {icons.users}
              </div>
            </Link>
            <Link
              href="/settings"
              className={`nav-item ${pathname === "/settings" ? "is-active" : ""}`}
              title="Настройки"
            >
              <div className="icon-bubble" style={{ background: "#F5F5F7" }}>
                {icons.settings}
              </div>
            </Link>
          </>
        )}
      </nav>
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => setUseModernIcons(!useModernIcons)}
          style={{
            background: "#f0f0f0",
            border: "none",
            borderRadius: "4px",
            fontSize: "10px",
            padding: "4px 8px",
            cursor: "pointer",
            opacity: 0.6,
          }}
          title="Переключить стиль иконок"
        >
          {useModernIcons ? "MODERN" : "CLASSIC"}
        </button>
        <button
          onClick={handleLogout}
          className="nav-item"
          title="Выход"
          style={{
            background: "none",
            border: "none",
            width: "100%",
            cursor: "pointer",
          }}
        >
          <div className="icon-bubble">{icons.logout}</div>
        </button>
      </div>
    </aside>
  );
}
