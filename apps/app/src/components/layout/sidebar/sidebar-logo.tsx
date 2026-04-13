"use client";

import Link from "next/link";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@calls/ui";
import { paths } from "@calls/config";

export function SidebarLogo() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href={paths.dashboard.root}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <span className="text-sm font-bold">Q</span>
            </div>
            <span className="truncate font-semibold">QBS Звонки</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
