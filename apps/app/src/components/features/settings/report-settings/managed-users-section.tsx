import { Checkbox, Label } from "@calls/ui";
import type React from "react";
import type {
  ReportSettingsForm,
  ReportSettingsUserOption,
} from "../report-settings-types";

function getDisplayName(u: ReportSettingsUserOption): string {
  const parts = [u.givenName, u.familyName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : u.email;
}

interface ManagedUsersSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  user: { id: string };
  allUsers: ReportSettingsUserOption[];
}

export function ManagedUsersSection({
  form,
  setForm,
  user,
  allUsers,
}: ManagedUsersSectionProps) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <h4 className="mb-2 text-sm font-bold">
        Сводный отчёт по выбранным менеджерам
      </h4>
      <p className="mb-3 text-sm text-muted-foreground">
        Выберите, по каким менеджерам включать данные в сводный отчёт в Telegram
        (опция «Получать отчеты по всем менеджерам» настраивается в Управлении
        пользователями). Если никого не выбрано — в сводку попадают все.
      </p>
      <div className="flex max-h-[200px] flex-col gap-1.5 overflow-y-auto">
        {allUsers
          .filter((u) => u.id !== user.id)
          .map((u) => {
            const display = getDisplayName(u) || u.email || "—";
            const checked = form.reportManagedUserIds?.includes(u.id) ?? false;
            const label =
              display !== u.email ? `${display} (${u.email})` : display;
            return (
              <Label
                key={u.id}
                className="flex cursor-pointer items-center gap-2 text-sm font-normal"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => {
                    const ids: string[] = form.reportManagedUserIds ?? [];
                    setForm((f) => ({
                      ...f,
                      reportManagedUserIds:
                        value === true
                          ? [...ids, u.id]
                          : ids.filter((id) => id !== u.id),
                    }));
                  }}
                />
                {label}
              </Label>
            );
          })}
        {allUsers.length <= 1 && (
          <span className="text-sm text-muted-foreground">
            Нет других пользователей
          </span>
        )}
      </div>
    </div>
  );
}
