"use client";

import { paths } from "@calls/config";
import { cn } from "@calls/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { useSession } from "@/lib/better-auth";

const SETTINGS_NAV = [
  {
    href: paths.settings.profile,
    label: "Аккаунт",
    description: "Имя, пароль, профиль",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: paths.settings.root,
    label: "Общие",
    description: "Отчёты и уведомления",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    href: paths.settings.workspace,
    label: "Рабочее пространство",
    description: "Название и параметры",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    adminOnly: true,
  },
  {
    href: paths.settings.evaluation,
    label: "Оценка звонков",
    description: "Шаблоны и критерии",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    adminOnly: true,
  },
  {
    href: paths.settings.integrations,
    label: "Интеграции",
    description: "FTP, Telegram, боты",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    href: paths.settings.pbx,
    label: "АТС",
    description: "Провайдеры и телефония",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.79.61 2.65a2 2 0 0 1-.45 2.11L8 9.99a16 16 0 0 0 6 6l1.51-1.27a2 2 0 0 1 2.11-.45c.86.28 1.75.49 2.65.61A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    adminOnly: true,
  },
  {
    href: paths.settings.backup,
    label: "Резервная копия",
    description: "Экспорт базы данных",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    adminOnly: true,
  },
] as const;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { activeWorkspace } = useWorkspace();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user ?? null;
  const _userLoading = sessionPending;
  const isWorkspaceAdmin =
    activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

  const navItems = SETTINGS_NAV.filter(
    (item) => !("adminOnly" in item && item.adminOnly) || isWorkspaceAdmin,
  );

  return (
    <div className="app-container">
      <Sidebar />
      <Header user={user} />

      <main className="main-content">
        <div className="flex gap-8">
          {/* Settings sidebar nav — dub.co style */}
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="sticky top-24 flex flex-col gap-0.5">
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Настройки
              </p>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== paths.settings.root &&
                    pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md",
                        isActive ? "bg-primary/20 text-foreground" : "bg-muted",
                      )}
                    >
                      {item.icon}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span>{item.label}</span>
                      <span
                        className={cn(
                          "text-xs truncate",
                          isActive
                            ? "text-muted-foreground"
                            : "text-muted-foreground/80",
                        )}
                      >
                        {item.description}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </main>
    </div>
  );
}
