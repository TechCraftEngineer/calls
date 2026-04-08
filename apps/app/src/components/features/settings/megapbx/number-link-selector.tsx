"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@calls/ui";
import { Check, ChevronDown, Search, User } from "lucide-react";
import { useMemo, useState } from "react";
import type { PbxCandidateUser } from "../types";

interface NumberLinkSelectorProps {
  options: PbxCandidateUser[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function NumberLinkSelector({
  options,
  value,
  onChange,
  disabled,
  placeholder = "Выберите пользователя...",
}: NumberLinkSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedUser = useMemo(() => {
    if (!value) return null;
    const [, id] = value.split(":");
    return options.find((u) => u.id === id) || null;
  }, [value, options]);

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return options;
    return options.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.internalExtensions?.toLowerCase().includes(query),
    );
  }, [search, options]);

  const handleSelect = (id: string) => {
    onChange(`user:${id}`);
    setOpen(false);
    setSearch("");
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !selectedUser && "text-muted-foreground",
          )}
        >
          {selectedUser ? (
            <span className="flex items-center gap-2 truncate">
              <Avatar className="h-5 w-5">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser.email}&backgroundColor=e5e7eb`}
                  alt={selectedUser.name || selectedUser.email}
                />
                <AvatarFallback className="text-[10px]">
                  {getInitials(selectedUser.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {selectedUser.name || selectedUser.email}
              </span>
            </span>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Поиск по имени, email..."
            className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-[300px] overflow-auto p-1">
          {filteredUsers.length > 0 ? (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                Пользователи ({filteredUsers.length})
              </div>
              {filteredUsers.map((user) => {
                const userValue = `user:${user.id}`;
                const isSelected = value === userValue;

                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelect(user.id)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Avatar className="h-6 w-6 mr-2 shrink-0">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}&backgroundColor=e5e7eb`}
                        alt={user.name || user.email}
                      />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="truncate font-medium">
                        {user.name || user.email}
                      </span>
                      {user.name && (
                        <span className="truncate text-xs text-muted-foreground">
                          {user.email}
                          {user.internalExtensions && (
                            <span className="ml-1 text-xs text-muted-foreground/70">
                              · вн. {user.internalExtensions}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="ml-auto h-4 w-4 shrink-0" />
                    )}
                  </button>
                );
              })}
            </>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {search ? "Ничего не найдено" : "Нет доступных пользователей"}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
