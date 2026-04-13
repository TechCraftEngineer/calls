"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@calls/ui";

import { AppSidebar } from "./sidebar/index";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-12 items-center gap-2 border-b px-4 lg:hidden">
          <SidebarTrigger />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

// Legacy export for backward compatibility
export default function Sidebar() {
  return null;
}

