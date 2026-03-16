"use client";

import { Button } from "@calls/ui";
import { useEffect, useRef, useState } from "react";
import CreateWorkspaceModal from "@/components/features/workspaces/create-workspace-modal";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import type { User } from "@/lib/auth";

const roleTranslations: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  member: "Участник",
};

interface WorkspaceSwitcherProps {
  user: User | null;
}

export default function WorkspaceSwitcher({ user }: WorkspaceSwitcherProps) {
  const {
    workspaces,
    activeWorkspace,
    loading,
    setActiveWorkspace,
    refreshWorkspaces,
  } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    // Always add cleanup function
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = async (wsId: string) => {
    setIsOpen(false);
    await setActiveWorkspace(wsId);
  };

  if (loading && workspaces.length === 0) {
    return (
      <div className="workspace-switcher-placeholder mb-6">
        <div className="w-10 h-10 rounded-lg bg-gray-100 animate-pulse m-auto" />
      </div>
    );
  }
  return (
    <>
      <div className="workspace-switcher" ref={dropdownRef}>
        <Button
          type="button"
          variant="ghost"
          className="workspace-toggle"
          onClick={() => setIsOpen(!isOpen)}
          title={activeWorkspace?.name || "Выберите рабочее пространство"}
        >
          <div className="workspace-icon">
            {activeWorkspace?.name?.charAt(0).toUpperCase() || "W"}
          </div>
        </Button>

        {isOpen && (
          <div className="workspace-menu">
            <div className="workspace-menu-header">Рабочие пространства</div>
            <div className="workspace-list">
              {workspaces.map((ws) => (
                <Button
                  key={ws.id}
                  type="button"
                  variant="ghost"
                  className={`workspace-item w-full justify-start ${ws.id === activeWorkspace?.id ? "is-active" : ""}`}
                  onClick={() => handleSelect(ws.id)}
                >
                  <div className="workspace-item-icon">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="workspace-item-info">
                    <div className="workspace-item-name">{ws.name}</div>
                    <div className="workspace-item-role">
                      {roleTranslations[ws.role] || ws.role}
                    </div>
                  </div>
                  {ws.id === activeWorkspace?.id && (
                    <span className="check-icon">✓</span>
                  )}
                </Button>
              ))}
            </div>
            <div className="workspace-menu-footer">
              <Button
                variant="ghost"
                className="add-workspace-btn"
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
              >
                + Создать рабочее пространство
              </Button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => {
            // Always allow closing the modal, even if no workspaces exist
            setShowCreateModal(false);
          }}
          onSuccess={async () => {
            setShowCreateModal(false);
            await refreshWorkspaces();
          }}
        />
      )}
    </>
  );
}
