"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@calls/ui";
import Header from "@/components/layout/header";
import { AppSidebar } from "@/components/layout/sidebar/index";
import { useSession } from "@/lib/better-auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-12 items-center gap-2 border-b px-4 lg:hidden">
          <SidebarTrigger />
        </div>
        <Header user={session?.user ?? null} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
