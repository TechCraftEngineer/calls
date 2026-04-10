"use client";

import {
  AudioWaveform,
  BarChart3,
  ChevronRight,
  ChevronUp,
  Home,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { paths } from "@calls/config";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@calls/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calls/ui";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";

const roleTranslations: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  member: "Участник",
};

const navItems = [
  {
    title: "Звонки",
    href: paths.dashboard.root,
    icon: Home,
  },
  {
    title: "Статистика",
    href: paths.statistics.root,
    icon: BarChart3,
  },
];

const adminNavItems = [
  {
    title: "Пользователи",
    href: paths.users.root,
    icon: Users,
  },
  {
    title: "Настройки",
    href: paths.settings.root,
    icon: Settings,
  },
];

function WorkspaceSwitcher() {
  const { isMobile } = useSidebar();
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();

  if (!activeWorkspace) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <AudioWaveform className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{activeWorkspace.name}</span>
                <span className="truncate text-xs">
                  {roleTranslations[activeWorkspace.role] || activeWorkspace.role}
                </span>
              </div>
              <ChevronUp className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-popper-anchor-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Компании
            </DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => setActiveWorkspace(ws.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <AudioWaveform className="size-4 shrink-0" />
                </div>
                <span className="flex-1 truncate">{ws.name}</span>
                {ws.id === activeWorkspace.id && (
                  <span className="text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" asChild>
              <Link href={paths.onboarding.createWorkspace}>
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <span className="text-sm">+</span>
                </div>
                <span className="text-muted-foreground">Создать компанию</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function SetupCard() {
  // Заглушка для данных прогресса - можно заменить на реальные данные
  const completedSteps = 1;
  const totalSteps = 4;
  const progressPercent = (completedSteps / totalSteps) * 100;
  const circumference = 2 * Math.PI * 11; // r=11
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href="/setup" className="block w-full px-2">
          <div
            data-size="default"
            className="group/card rounded-lg border bg-card text-card-foreground cursor-pointer transition-all shadow-none p-2.5 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-8 w-8">
                  <svg
                    className="h-8 w-8 -rotate-90 transform"
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                  >
                    <circle
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      r="11"
                      cx="16"
                      cy="16"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                      r="11"
                      cx="16"
                      cy="16"
                      className="text-green-500 transition-all duration-300 ease-in-out"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Настройка сервиса</h3>
                  <p className="text-xs text-muted-foreground">
                    {completedSteps}/{totalSteps} завершено
                  </p>
                </div>
              </div>
              <ChevronRight
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          </div>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { activeWorkspace } = useWorkspace();
  const isWorkspaceAdmin =
    activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

  const isActive = (href: string) => {
    if (href === paths.dashboard.root) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={paths.dashboard.root}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <span className="text-sm font-bold">M</span>
                </div>
                <span className="truncate font-semibold">MegaPBX</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <WorkspaceSwitcher />
        <SetupCard />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isWorkspaceAdmin &&
                adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Выход">
              <Link href={paths.auth.signout}>
                <LogOut />
                <span>Выход</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
