"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@calls/ui";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { CircularProgress } from "./circular-progress";

const TOTAL_STEPS = 5;

export function SetupCard() {
  const { activeWorkspace } = useWorkspace();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem("setup_completed_steps");
    const steps = saved ? (JSON.parse(saved) as string[]).length : 0;
    setCompletedSteps(steps);
  }, []);

  // Don't show setup card if onboarding is complete
  if (activeWorkspace?.isOnboarded) {
    return null;
  }

  const progressPercent = (completedSteps / TOTAL_STEPS) * 100;
  const tooltipText = `Настройка сервиса (${completedSteps}/${TOTAL_STEPS})`;

  // Collapsed state - show only icon button with tooltip
  if (isCollapsed) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={tooltipText}>
            <Link href="/setup" className="relative flex items-center justify-center">
              <CircularProgress progress={progressPercent} size={20} strokeWidth={5} />
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Expanded state - show full card
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href="/setup" className="block w-full px-2">
          <div className="group/card rounded-lg border bg-card text-card-foreground cursor-pointer transition-all shadow-none p-2.5 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgress progress={progressPercent} size={32} strokeWidth={4} />
                <div>
                  <h3 className="text-sm font-semibold">Настройка сервиса</h3>
                  <p className="text-xs text-muted-foreground">
                    {completedSteps}/{TOTAL_STEPS} завершено
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
          </div>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
