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
    <div className="p-4 bg-[#f5f7fa] rounded-lg">
      <h4 className="m-0 mb-3 text-sm font-bold">
        Сводный отчёт по выбранным менеджерам
      </h4>
      <p className="m-0 mb-3 text-xs text-[#666]">
        Выберите, по каким менеджерам включать данные в сводный отчёт в Telegram
        (опция «Получать отчеты по всем менеджерам» настраивается в Управлении
        пользователями). Если никого не выбрано — в сводку попадают все.
      </p>
      <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
        {allUsers
          .filter((u) => u.id !== user.id)
          .map((u) => {
            const display = getDisplayName(u) || u.email || "—";
            const checked =
              form.report_managed_user_ids?.includes(u.id) ?? false;
            const label =
              display !== u.email ? `${display} (${u.email})` : display;
            return (
              <label key={u.id} className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const ids: string[] = form.report_managed_user_ids ?? [];
                    setForm((f) => ({
                      ...f,
                      report_managed_user_ids: e.target.checked
                        ? [...ids, u.id]
                        : ids.filter((id) => id !== u.id),
                    }));
                  }}
                />
                {label}
              </label>
            );
          })}
        {allUsers.length <= 1 && (
          <span className="text-xs text-[#999]">Нет других пользователей</span>
        )}
      </div>
    </div>
  );
}
