"use client";

import { Button, Input, Popover, PopoverContent, PopoverTrigger, Switch } from "@calls/ui";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useEmployeeReportSettings } from "../hooks/use-employee-report-settings";
import type { PbxEmployeeItem } from "../types";

interface EmployeeReportSettingsCellProps {
  employee: PbxEmployeeItem;
}

export function EmployeeReportSettingsCell({ employee }: EmployeeReportSettingsCellProps) {
  const { settings, isLoading, updateSettings, isUpdating } = useEmployeeReportSettings(
    employee.id,
  );
  const [open, setOpen] = useState(false);
  const [localEmail, setLocalEmail] = useState(settings?.email || employee.email || "");
  const [localDaily, setLocalDaily] = useState(settings?.dailyReport || false);
  const [localWeekly, setLocalWeekly] = useState(settings?.weeklyReport || false);
  const [localMonthly, setLocalMonthly] = useState(settings?.monthlyReport || false);
  const [localSkipWeekends, setLocalSkipWeekends] = useState(settings?.skipWeekends || false);

  // Sync local state with settings when they change (but not when popover is open)
  useEffect(() => {
    if (!open && settings) {
      setLocalEmail(settings.email || employee.email || "");
      setLocalDaily(settings.dailyReport);
      setLocalWeekly(settings.weeklyReport);
      setLocalMonthly(settings.monthlyReport);
      setLocalSkipWeekends(settings.skipWeekends);
    }
  }, [settings, open, employee.email]);

  const hasAnyReport = settings?.dailyReport || settings?.weeklyReport || settings?.monthlyReport;

  const handleSave = () => {
    updateSettings({
      employeeId: employee.id,
      email: localEmail.trim() || null,
      dailyReport: localDaily,
      weeklyReport: localWeekly,
      monthlyReport: localMonthly,
      skipWeekends: localSkipWeekends,
    });
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset local state when opening
      setLocalEmail(settings?.email || employee.email || "");
      setLocalDaily(settings?.dailyReport || false);
      setLocalWeekly(settings?.weeklyReport || false);
      setLocalMonthly(settings?.monthlyReport || false);
      setLocalSkipWeekends(settings?.skipWeekends || false);
    }
    setOpen(newOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={hasAnyReport ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          disabled={isLoading}
        >
          <Mail className="h-4 w-4" />
          {hasAnyReport && (
            <span className="ml-1 text-xs">
              {[
                settings?.dailyReport && "D",
                settings?.weeklyReport && "W",
                settings?.monthlyReport && "M",
              ]
                .filter(Boolean)
                .join(",")}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Email отчёты</h4>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Email для отчётов</label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={localEmail}
              onChange={(e) => setLocalEmail(e.target.value)}
              className="h-8"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm">Ежедневный</label>
              <Switch checked={localDaily} onCheckedChange={setLocalDaily} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Еженедельный</label>
              <Switch checked={localWeekly} onCheckedChange={setLocalWeekly} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Ежемесячный</label>
              <Switch checked={localMonthly} onCheckedChange={setLocalMonthly} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <label className="text-sm text-muted-foreground">Пропускать выходные</label>
            <Switch checked={localSkipWeekends} onCheckedChange={setLocalSkipWeekends} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isUpdating}>
              Сохранить
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
