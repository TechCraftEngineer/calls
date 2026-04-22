"use client";

import { toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useORPC } from "@/orpc/react";

interface EmployeeReportSettings {
  employeeId: string;
  email: string | null;
  dailyReport: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  skipWeekends: boolean;
}

interface UpdateEmployeeReportSettingsInput {
  employeeId: string;
  email?: string | null;
  dailyReport?: boolean;
  weeklyReport?: boolean;
  monthlyReport?: boolean;
  skipWeekends?: boolean;
}

export function useEmployeeReportSettings(employeeId: string | undefined) {
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const query = useQuery<EmployeeReportSettings>({
    queryKey: ["employeeReportSettings", employeeId],
    queryFn: async () => {
      if (!employeeId) throw new Error("No employeeId");
      const result = await orpc.settings.getEmployeeReportSettings.call({ employeeId });
      return result;
    },
    enabled: !!employeeId,
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateEmployeeReportSettingsInput) =>
      orpc.settings.updateEmployeeReportSettings.call(input),
    onSuccess: () => {
      toast.success("Настройки сохранены");
      if (employeeId) {
        queryClient.invalidateQueries({
          queryKey: ["employeeReportSettings", employeeId],
        });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Ошибка сохранения настроек");
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

export type { EmployeeReportSettings, UpdateEmployeeReportSettingsInput };
