"use client";

import { paths } from "@calls/config";
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
  toast,
  useSidebar,
} from "@calls/ui";
import { AudioWaveform, ChevronUp, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CreateWorkspaceModal from "@/components/features/workspaces/create-workspace-modal";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { roleTranslations } from "./nav-items";

export function WorkspaceSwitcher() {
  const { isMobile } = useSidebar();
  const { workspaces, activeWorkspace, setActiveWorkspace, refreshWorkspaces } = useWorkspace();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!activeWorkspace) {
    return null;
  }

  const handleSelectWorkspace = async (workspaceId: string) => {
    setDropdownOpen(false);
    await setActiveWorkspace(workspaceId);
  };

  const handleDropdownOpenChange = async (open: boolean) => {
    setDropdownOpen(open);
    if (open) {
      try {
        await refreshWorkspaces();
      } catch (error) {
        toast.error("Не удалось обновить список компаний");
        console.error("Error refreshing workspaces:", error);
      }
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={dropdownOpen} onOpenChange={handleDropdownOpenChange}>
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
                  handleSelectWorkspace(ws.id);
                }}
                className="gap-2 p-2 cursor-pointer"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <AudioWaveform className="size-4 shrink-0" />
                </div>
                <span className="flex-1 truncate">{ws.name}</span>
                {ws.id === activeWorkspace.id && (
                  <>
                    <span className="text-xs text-muted-foreground" aria-hidden="true">
                      ✓
                    </span>
                    <span className="sr-only">Выбрано</span>
                  </>
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

      <CreateWorkspaceModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={async (workspaceId) => {
          await setActiveWorkspace(workspaceId);
          router.push(paths.setup.root);
        }}
      />
    </SidebarMenu>
  );
}
