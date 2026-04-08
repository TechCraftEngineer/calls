"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@calls/ui";
import { Building2, Check, Phone, Search, User, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PbxCandidateInvitation, PbxCandidateUser, PbxEmployeeItem } from "../types";
import { getInitials } from "./utils";

interface EmployeeLinkDialogProps {
  employee: PbxEmployeeItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: {
    users: PbxCandidateUser[];
    invitations: PbxCandidateInvitation[];
  };
  onLink: (input: { userId?: string | null; invitationId?: string | null }) => Promise<void>;
  linking?: boolean;
}

export function EmployeeLinkDialog({
  employee,
  open,
  onOpenChange,
  options,
  onLink,
  linking,
}: EmployeeLinkDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("users");
  const [focusedUserIndex, setFocusedUserIndex] = useState(0);
  const [focusedInvitationIndex, setFocusedInvitationIndex] = useState(0);

  // Сброс состояния при смене сотрудника
  useEffect(() => {
    setSelectedUserId(null);
    setSelectedInvitationId(null);
    setSearch("");
    setActiveTab("users");
    setFocusedUserIndex(0);
    setFocusedInvitationIndex(0);
  }, [employee?.externalId]);

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return options.users;
    return options.users.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.internalExtensions?.toLowerCase().includes(query) ||
        user.givenName?.toLowerCase().includes(query) ||
        user.familyName?.toLowerCase().includes(query),
    );
  }, [search, options.users]);

  const filteredInvitations = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return options.invitations;
    return options.invitations.filter(
      (inv) => inv.email.toLowerCase().includes(query) || inv.role.toLowerCase().includes(query),
    );
  }, [search, options.invitations]);

  // Сброс фокуса при изменении фильтра
  useEffect(() => {
    setFocusedUserIndex(0);
  }, [filteredUsers]);

  useEffect(() => {
    setFocusedInvitationIndex(0);
  }, [filteredInvitations]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return options.users.find((u) => u.id === selectedUserId) || null;
  }, [selectedUserId, options.users]);

  const selectedInvitation = useMemo(() => {
    if (!selectedInvitationId) return null;
    return options.invitations.find((i) => i.id === selectedInvitationId) || null;
  }, [selectedInvitationId, options.invitations]);

  const hasSelection = selectedUserId || selectedInvitationId;

  const handleUserKeyDown = (e: React.KeyboardEvent) => {
    const maxIndex = filteredUsers.length - 1;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedUserIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedUserIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
        break;
      case "Home":
        e.preventDefault();
        setFocusedUserIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusedUserIndex(maxIndex);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (filteredUsers[focusedUserIndex]) {
          handleSelectUser(filteredUsers[focusedUserIndex].id);
        }
        break;
    }
  };

  const handleInvitationKeyDown = (e: React.KeyboardEvent) => {
    const maxIndex = filteredInvitations.length - 1;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedInvitationIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedInvitationIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
        break;
      case "Home":
        e.preventDefault();
        setFocusedInvitationIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusedInvitationIndex(maxIndex);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (filteredInvitations[focusedInvitationIndex]) {
          handleSelectInvitation(filteredInvitations[focusedInvitationIndex].id);
        }
        break;
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedInvitationId(null);
  };

  const handleSelectInvitation = (invitationId: string) => {
    setSelectedInvitationId(invitationId);
    setSelectedUserId(null);
  };

  const handleLink = async () => {
    if (!hasSelection) return;
    await onLink({
      userId: selectedUserId,
      invitationId: selectedInvitationId,
    });
    // Close dialog after successful link
    onOpenChange(false);
    // Reset after successful link
    setSelectedUserId(null);
    setSelectedInvitationId(null);
    setSearch("");
  };

  const handleClose = () => {
    setSelectedUserId(null);
    setSelectedInvitationId(null);
    setSearch("");
    onOpenChange(false);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Header с информацией о сотруднике */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6 border-b">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Привязка сотрудника АТС</DialogTitle>
                <DialogDescription className="text-base">
                  Выберите пользователя воркспейса для привязки
                </DialogDescription>
              </div>
            </div>

            {/* Карточка сотрудника */}
            <div className="mt-4 rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                    {getInitials(employee.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{employee.displayName}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                    {employee.extension && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        Вн. номер: {employee.extension}
                      </span>
                    )}
                    {employee.email && <span className="truncate">{employee.email}</span>}
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Выбранный пользователь */}
        {hasSelection && (
          <div className="px-6 py-3 bg-green-50/50 border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Check className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900">Будет привязан:</p>
                <p className="text-sm text-green-700 truncate">
                  {selectedUser
                    ? `${selectedUser.name || selectedUser.email} (${selectedUser.email})`
                    : selectedInvitation
                      ? `${selectedInvitation.email} (приглашение)`
                      : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSelectedUserId(null);
                  setSelectedInvitationId(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Поиск и табы */}
        <div className="px-6 py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, email, внутреннему номеру..."
              aria-label="Поиск по имени, email или внутреннему номеру"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users" className="gap-2">
                <User className="h-4 w-4" />
                Пользователи
                <span className="ml-1 text-xs text-muted-foreground">({filteredUsers.length})</span>
              </TabsTrigger>
              <TabsTrigger value="invitations" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Приглашения
                <span className="ml-1 text-xs text-muted-foreground">
                  ({filteredInvitations.length})
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-0 pt-4">
              <div
                className="h-[320px] overflow-y-auto pr-4"
                role="listbox"
                aria-label="Пользователи"
                tabIndex={0}
                onKeyDown={handleUserKeyDown}
              >
                {filteredUsers.length > 0 ? (
                  <div className="space-y-2">
                    {filteredUsers.map((user, index) => {
                      const isSelected = selectedUserId === user.id;

                      return (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUser(user.id)}
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={index === focusedUserIndex ? 0 : -1}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:border-primary/50 hover:bg-accent",
                          )}
                        >
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}&backgroundColor=e5e7eb`}
                              alt={user.name || user.email}
                            />
                            <AvatarFallback className="text-xs font-medium">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {user.name || user.email}
                              </span>
                              {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              <span className="truncate">{user.email}</span>
                              {user.internalExtensions && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {user.internalExtensions}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {search ? "Пользователи не найдены" : "Нет доступных пользователей"}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="invitations" className="mt-0 pt-4">
              <div
                className="h-[320px] overflow-y-auto pr-4"
                role="listbox"
                aria-label="Приглашения"
                tabIndex={0}
                onKeyDown={handleInvitationKeyDown}
              >
                {filteredInvitations.length > 0 ? (
                  <div className="space-y-2">
                    {filteredInvitations.map((inv, index) => {
                      const isSelected = selectedInvitationId === inv.id;

                      return (
                        <button
                          key={inv.id}
                          onClick={() => handleSelectInvitation(inv.id)}
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={index === focusedInvitationIndex ? 0 : -1}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:border-primary/50 hover:bg-accent",
                          )}
                        >
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="text-xs font-medium bg-muted">
                              ?
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{inv.email}</span>
                              {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Роль: {inv.role} · Ожидает приглашения
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <UserPlus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {search ? "Приглашения не найдены" : "Нет активных приглашений"}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <Separator />

        {/* Footer */}
        <DialogFooter className="px-6 py-4 gap-2">
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
          <Button onClick={handleLink} disabled={!hasSelection || linking} className="gap-2">
            {linking ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Привязка...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Привязать
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
