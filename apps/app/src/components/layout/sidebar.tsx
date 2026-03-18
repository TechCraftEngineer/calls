"use client";

import { paths } from "@calls/config";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";

import WorkspaceSwitcher from "./workspace-switcher";

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
  workspace: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-amber-600"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
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

export default function Sidebar() {
  const pathname = usePathname();
  const { activeWorkspace } = useWorkspace();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const isWorkspaceAdmin =
    activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

  useEffect(() => {
    if (!pathname) return;
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    overlayRef.current?.focus();
  }, [isMobileMenuOpen]);

  const navItems = [
    {
      href: paths.dashboard.root,
      isActive: pathname === paths.dashboard.root,
      title: "Звонки",
      icon: <div className="icon-bubble bg-orange-50">{icons.dashboard}</div>,
    },
    {
      href: paths.statistics.root,
      isActive: pathname.startsWith(paths.statistics.root),
      title: "Статистика",
      icon: <div className="icon-bubble bg-blue-50">{icons.statistics}</div>,
    },
    ...(isWorkspaceAdmin
      ? [
          {
            href: paths.users.root,
            isActive: pathname === paths.users.root,
            title: "Пользователи",
            icon: <div className="icon-bubble bg-purple-50">{icons.users}</div>,
          },
          {
            href: paths.settings.root,
            isActive: pathname.startsWith(paths.settings.root),
            title: "Настройки",
            icon: (
              <div className="icon-bubble bg-gray-50">{icons.settings}</div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <button
        type="button"
        className="mobile-menu-trigger"
        aria-label={isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        ref={overlayRef}
        className={`mobile-sidebar-overlay ${isMobileMenuOpen ? "is-open" : ""}`}
        aria-hidden={!isMobileMenuOpen}
        tabIndex={isMobileMenuOpen ? 0 : -1}
        onClick={() => setIsMobileMenuOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsMobileMenuOpen(false);
          }
        }}
      />

      <aside className={`sidebar ${isMobileMenuOpen ? "is-mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <Link
            href={paths.dashboard.root}
            className="sidebar-logo"
            title="QBS Звонки"
          >
            M
          </Link>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Закрыть меню"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span />
            <span />
          </button>
        </div>

        <WorkspaceSwitcher />

        <nav className="flex w-full flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${item.isActive ? "is-active" : ""}`}
              title={item.title}
            >
              {item.icon}
              <span className="nav-item-label">{item.title}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex w-full flex-col gap-3 items-center">
          <Link href={paths.auth.signout} className="nav-item" title="Выход">
            <div className="icon-bubble">{icons.logout}</div>
            <span className="nav-item-label">Выход</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
