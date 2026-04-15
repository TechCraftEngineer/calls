"use client";

import { paths } from "@calls/config";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@calls/ui";
import { LogOut, PanelLeft, PanelRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { adminNavItems, memberNavItems, type NavItem, navItems } from "./nav-items";
import { SetupCard } from "./setup-card";
import { SidebarLogo } from "./sidebar-logo";
import { WorkspaceSwitcher } from "./workspace-switcher";

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link href={item.href}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { activeWorkspace } = useWorkspace();
  const { toggleSidebar, state } = useSidebar();

  const isMember = activeWorkspace?.role === "member";

  const isActive = (href: string) => {
    if (href === paths.dashboard.root) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Для member показываем только настройки отчетов, для admin/owner - полные настройки
  // Если workspace не загружен, показываем пустой массив
  const roleSpecificNavItems = !activeWorkspace ? [] : isMember ? memberNavItems : adminNavItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarLogo />
        <WorkspaceSwitcher />
        <SetupCard />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupAction
            onClick={toggleSidebar}
            title={state === "collapsed" ? "Развернуть" : "Свернуть"}
          >
            {state === "collapsed" ? (
              <PanelRight className="size-4" />
            ) : (
              <PanelLeft className="size-4" />
            )}
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
              ))}
              {roleSpecificNavItems.map((item) => (
                <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
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
                Выход
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export { useSidebar } from "@calls/ui";
