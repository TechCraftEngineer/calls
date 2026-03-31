"use client";

import { paths } from "@calls/config";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";

import WorkspaceSwitcher from "./workspace-switcher";

const ICONS = {
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);
  const hiddenSiblingsRef = useRef<
    Array<{
      el: HTMLElement;
      prevAriaHidden: string | null;
      prevInert: boolean;
    }>
  >([]);
  const isWorkspaceAdmin = activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

  const getFocusableInMenu = useCallback(() => {
    const root = menuRef.current;
    if (!root) return [];

    const selectors = [
      'a[href]:not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    return Array.from(root.querySelectorAll<HTMLElement>(selectors)).filter((el) => {
      if (el.getAttribute("aria-hidden") === "true") return false;
      if (el.hasAttribute("hidden")) return false;
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }, []);

  const restoreTriggerFocus = useCallback(() => {
    const trigger = menuTriggerRef.current;
    if (!trigger || trigger.disabled || trigger.tabIndex === -1) {
      return;
    }

    trigger.focus();
  }, []);

  const closeMobileMenu = useCallback(() => {
    shouldRestoreFocusRef.current = true;
    setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (isMobileMenuOpen) {
      closeMobileMenu();
    }
  }, [closeMobileMenu, isMobileMenuOpen, pathname]);

  useEffect(() => {
    return () => {
      if (hiddenSiblingsRef.current.length > 0) {
        for (const item of hiddenSiblingsRef.current) {
          if (item.prevAriaHidden == null) {
            item.el.removeAttribute("aria-hidden");
          } else {
            item.el.setAttribute("aria-hidden", item.prevAriaHidden);
          }
          (item.el as unknown as { inert?: boolean }).inert = item.prevInert;
        }
        hiddenSiblingsRef.current = [];
      }
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      const focusables = getFocusableInMenu();
      const initial =
        closeButtonRef.current ?? focusables[0] ?? (menuRef.current as HTMLElement | null);
      initial?.focus?.();

      const container = menuRef.current?.closest(".app-container");
      if (container) {
        const toHide = Array.from(container.children).filter((child) => {
          if (!(child instanceof HTMLElement)) return false;
          if (child.contains(menuRef.current)) return false;
          if (overlayRef.current && child.contains(overlayRef.current)) return false;
          if (menuTriggerRef.current && child.contains(menuTriggerRef.current)) return false;
          return true;
        }) as HTMLElement[];

        hiddenSiblingsRef.current = toHide.map((el) => ({
          el,
          prevAriaHidden: el.getAttribute("aria-hidden"),
          prevInert: (el as unknown as { inert?: boolean }).inert === true,
        }));

        for (const el of toHide) {
          el.setAttribute("aria-hidden", "true");
          // inert ещё не типизирован в TS DOM lib в некоторых окружениях
          (el as unknown as { inert?: boolean }).inert = true;
        }
      }
      return;
    }

    if (shouldRestoreFocusRef.current) {
      restoreTriggerFocus();
      shouldRestoreFocusRef.current = false;
    }

    if (hiddenSiblingsRef.current.length > 0) {
      for (const item of hiddenSiblingsRef.current) {
        if (item.prevAriaHidden == null) {
          item.el.removeAttribute("aria-hidden");
        } else {
          item.el.setAttribute("aria-hidden", item.prevAriaHidden);
        }
        (item.el as unknown as { inert?: boolean }).inert = item.prevInert;
      }
      hiddenSiblingsRef.current = [];
    }
  }, [getFocusableInMenu, isMobileMenuOpen, restoreTriggerFocus]);

  const onMenuKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isMobileMenuOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileMenu();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = getFocusableInMenu();
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !menuRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [closeMobileMenu, getFocusableInMenu, isMobileMenuOpen],
  );

  const navItems = [
    {
      href: paths.dashboard.root,
      isActive: pathname === paths.dashboard.root,
      title: "Звонки",
      icon: <div className="icon-bubble bg-orange-50">{ICONS.dashboard}</div>,
    },
    {
      href: paths.statistics.root,
      isActive: pathname.startsWith(paths.statistics.root),
      title: "Статистика",
      icon: <div className="icon-bubble bg-blue-50">{ICONS.statistics}</div>,
    },
    ...(isWorkspaceAdmin
      ? [
          {
            href: paths.users.root,
            isActive: pathname === paths.users.root,
            title: "Пользователи",
            icon: <div className="icon-bubble bg-purple-50">{ICONS.users}</div>,
          },
          {
            href: paths.settings.root,
            isActive: pathname.startsWith(paths.settings.root),
            title: "Настройки",
            icon: <div className="icon-bubble bg-gray-50">{ICONS.settings}</div>,
          },
        ]
      : []),
  ];

  return (
    <>
      <button
        ref={menuTriggerRef}
        type="button"
        className="mobile-menu-trigger"
        aria-label={isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
        aria-expanded={isMobileMenuOpen}
        onClick={() => {
          if (isMobileMenuOpen) {
            closeMobileMenu();
            return;
          }

          shouldRestoreFocusRef.current = false;
          setIsMobileMenuOpen(true);
        }}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        ref={overlayRef}
        className={`mobile-sidebar-overlay ${isMobileMenuOpen ? "is-open" : ""}`}
        aria-hidden={!isMobileMenuOpen}
        tabIndex={-1}
        onClick={closeMobileMenu}
      />

      <div
        ref={menuRef}
        className={`sidebar ${isMobileMenuOpen ? "is-mobile-open" : ""}`}
        onKeyDown={onMenuKeyDown}
        role={isMobileMenuOpen ? "dialog" : undefined}
        {...(isMobileMenuOpen
          ? ({
              "aria-modal": "true",
              "aria-label": "Меню навигации",
            } as Record<string, string>)
          : {})}
      >
        <div className="sidebar-brand">
          <Link href={paths.dashboard.root} className="sidebar-logo" title="QBS Звонки">
            M
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            className="sidebar-close"
            aria-label="Закрыть меню"
            onClick={closeMobileMenu}
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
            <div className="icon-bubble">{ICONS.logout}</div>
            <span className="nav-item-label">Выход</span>
          </Link>
        </div>
      </div>
    </>
  );
}
