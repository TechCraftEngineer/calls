"use client";

import { paths } from "@calls/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from "@calls/ui";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import type { User } from "@/lib/auth";

/** Роли в workspace: owner, admin, member. Глобальные: admin, user. */
const ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  member: "Участник",
  user: "Пользователь",
};

function getDisplayRole(
  workspaceRole: string | undefined,
  globalRole: string | undefined | null,
): string {
  if (workspaceRole && ROLE_LABELS[workspaceRole]) {
    return ROLE_LABELS[workspaceRole];
  }
  if (globalRole === "admin") return ROLE_LABELS.admin;
  return ROLE_LABELS.user;
}

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const { activeWorkspace, loading } = useWorkspace();
  const displayRole = getDisplayRole(activeWorkspace?.role, user?.role);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-900 flex h-16 items-center justify-between overflow-visible border-b border-gray-200 bg-white px-4 pl-16 md:justify-end md:px-8">
      <div className="min-w-0 pr-3 md:hidden">
        {loading ? (
          <>
            <Skeleton className="h-5 w-32 max-w-full" />
            <Skeleton className="mt-1 h-3 w-28 max-w-full" />
          </>
        ) : (
          <>
            <div className="truncate text-sm font-semibold text-gray-900">
              {activeWorkspace?.name}
            </div>
            <div className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Компания
            </div>
          </>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left outline-none hover:opacity-90 focus:opacity-90 sm:gap-3"
            aria-label="Меню пользователя"
          >
            <div className="mr-1 hidden min-w-0 text-right sm:block">
              <div className="text-[13px] font-semibold text-gray-800">
                {user.name || user.email}
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-gray-500">
                {displayRole}
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-600">
              {(user.name || user.email)[0].toUpperCase()}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="z-1000 min-w-45"
        >
          <DropdownMenuItem asChild>
            <Link href={paths.settings.profile}>
              <Settings className="size-4" />
              Настройки аккаунта
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild variant="destructive">
            <Link href={paths.auth.signout}>
              <LogOut className="size-4" />
              Выйти
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
