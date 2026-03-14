"use client";

import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  useEffect(() => {
    // Показываем модалку если загрузка завершена, рабочих пространств нет и мы не на странице входа
    if (
      !loading &&
      user &&
      workspaces.length === 0 &&
      !pathname.includes("/auth/signin")
    ) {
      setShowCreateModal(true);
    }
  }, [loading, user, workspaces.length, pathname]);

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
        <button
          type="button"
          className="workspace-toggle"
          onClick={() => setIsOpen(!isOpen)}
          title={activeWorkspace?.name || "Выберите рабочее пространство"}
        >
          <div className="workspace-icon">
            {activeWorkspace?.name?.charAt(0).toUpperCase() || "W"}
          </div>
        </button>

        {isOpen && (
          <div className="workspace-menu">
            <div className="workspace-menu-header">Рабочие пространства</div>
            <div className="workspace-list">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  className={`workspace-item ${ws.id === activeWorkspace?.id ? "is-active" : ""}`}
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
                </button>
              ))}
            </div>
            <div className="workspace-menu-footer">
              <button
                className="add-workspace-btn"
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
              >
                + Создать рабочее пространство
              </button>
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
