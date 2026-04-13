"use client";

import { AudioWaveform, ChevronUp, Plus } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@calls/ui";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import CreateWorkspaceModal from "@/components/features/workspaces/create-workspace-modal";
import { roleTranslations } from "./nav-items";

export function WorkspaceSwitcher() {
  const { isMobile } = useSidebar();
  const { workspaces, activeWorkspace, setActiveWorkspace, refreshWorkspaces } = useWorkspace();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
                onSelect={(e) => {
                  e.preventDefault();
                  setActiveWorkspace(ws.id);
                }}
                className="gap-2 p-2 cursor-pointer"
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
            <DropdownMenuItem
              className="gap-2 p-2 cursor-pointer"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <span className="text-muted-foreground">Создать компанию</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {isCreateModalOpen && (
        <CreateWorkspaceModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={async (workspaceId) => {
            setIsCreateModalOpen(false);
            await refreshWorkspaces();
            await setActiveWorkspace(workspaceId);
          }}
        />
      )}
    </SidebarMenu>
  );
}
