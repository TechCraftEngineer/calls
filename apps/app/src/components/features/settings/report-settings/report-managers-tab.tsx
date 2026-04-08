"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
} from "@calls/ui";
import { Save, Search, UserCheck, Users } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type { ReportSettingsForm, ReportSettingsUserOption } from "./report-settings-types";

interface ReportManagersTabProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  user: { id: string };
  allUsers: ReportSettingsUserOption[];
}

function getDisplayName(u: ReportSettingsUserOption): string {
  const parts = [u.givenName, u.familyName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : u.email;
}

export function ReportManagersTab({ form, setForm, user, allUsers }: ReportManagersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const selectedCount = form.reportManagedUserIds?.length ?? 0;

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return allUsers
      .filter((u) => u.id !== user.id)
      .filter((u) => {
        if (!query) return true;
        const displayName = getDisplayName(u).toLowerCase();
        const email = u.email.toLowerCase();
        return displayName.includes(query) || email.includes(query);
      });
  }, [allUsers, user.id, searchQuery]);

  const handleToggleAll = () => {
    if (selectedCount === allUsers.filter((u) => u.id !== user.id).length) {
      // All selected, deselect all
      setForm((f) => ({ ...f, reportManagedUserIds: [] }));
    } else {
      // Select all
      const allIds = allUsers.filter((u) => u.id !== user.id).map((u) => u.id);
      setForm((f) => ({ ...f, reportManagedUserIds: allIds }));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Сводный отчёт по менеджерам
          {selectedCount > 0 && (
            <span className="text-xs text-muted-foreground">({selectedCount})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени или email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Если список пуст — в отчёт будут включены все менеджеры.
        </p>

        {/* Select All Button */}
        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
              <Checkbox
                checked={
                  selectedCount === allUsers.filter((u) => u.id !== user.id).length &&
                  selectedCount > 0
                }
                onCheckedChange={handleToggleAll}
              />
              <span className="flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                Выбрать всех
              </span>
            </Label>
            <span className="text-xs text-muted-foreground">
              Показано {filteredUsers.length} из {allUsers.length - 1}
            </span>
          </div>
        )}

        {/* Users List */}
        <div className="border-t pt-2">
          <div className="max-h-72 overflow-y-auto space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? "Пользователи не найдены" : "Нет других пользователей"}
              </div>
            ) : (
              filteredUsers.map((u) => {
                const display = getDisplayName(u) || u.email || "—";
                const checked = form.reportManagedUserIds?.includes(u.id) ?? false;

                return (
                  <Label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        const ids: string[] = form.reportManagedUserIds ?? [];
                        setForm((f) => ({
                          ...f,
                          reportManagedUserIds:
                            value === true ? [...ids, u.id] : ids.filter((id) => id !== u.id),
                        }));
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{display}</div>
                      {display !== u.email && u.email && (
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      )}
                    </div>
                    {checked && <span className="text-xs text-muted-foreground">Включён</span>}
                  </Label>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Summary */}
        {selectedCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {selectedCount} менеджеров будет включено в отчёт
          </p>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button size="sm">
            <Save className="h-4 w-4 mr-2" />
            Сохранить настройки
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
