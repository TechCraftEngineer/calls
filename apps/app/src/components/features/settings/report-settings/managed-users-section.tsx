import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
} from "@calls/ui";
import type React from "react";
import type {
  ReportSettingsForm,
  ReportSettingsUserOption,
} from "./report-settings-types";

function getDisplayName(u: ReportSettingsUserOption): string {
  const parts = [u.givenName, u.familyName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : u.email;
}

interface ManagedUsersSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
  user: { id: string };
  allUsers: ReportSettingsUserOption[];
  onSave: () => void;
  saving: boolean;
}

export function ManagedUsersSection({
  form,
  setForm,
  user,
  allUsers,
  onSave,
  saving,
}: ManagedUsersSectionProps) {
  const selectedCount = form.reportManagedUserIds?.length ?? 0;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-base">
          Сводный отчёт по выбранным менеджерам
        </CardTitle>
        <CardDescription>
          Если список пуст — отчёты попадут по всем менеджерам. Сейчас
          выбранных: {selectedCount}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Выберите, по каким менеджерам включать данные в сводный отчёт в
          Telegram (опция «Получать отчеты по всем менеджерам» настраивается в
          Управлении пользователями). Если никого не выбрано — в сводку попадают
          все.
        </p>
        <div className="flex max-h-50 flex-col gap-1.5 overflow-y-auto">
          {allUsers
            .filter((u) => u.id !== user.id)
            .map((u) => {
              const display = getDisplayName(u) || u.email || "—";
              const checked =
                form.reportManagedUserIds?.includes(u.id) ?? false;
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
      </CardContent>
      <CardFooter className="px-4 pt-0 flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </CardFooter>
    </Card>
  );
}
