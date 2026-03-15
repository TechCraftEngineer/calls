"use client";

import { Button, Card, CardContent } from "@calls/ui";
import { useEffect, useState } from "react";

interface InvitationSettings {
  notificationSettings?: {
    email?: {
      dailyReport?: boolean;
      weeklyReport?: boolean;
      monthlyReport?: boolean;
    };
    telegram?: {
      dailyReport?: boolean;
      managerReport?: boolean;
      weeklyReport?: boolean;
      monthlyReport?: boolean;
      skipWeekends?: boolean;
    };
  };
  reportSettings?: {
    includeCallSummaries?: boolean;
    detailed?: boolean;
    includeAvgValue?: boolean;
    includeAvgRating?: boolean;
  };
  kpiSettings?: {
    baseSalary?: number;
    targetBonus?: number;
    targetTalkTimeMinutes?: number;
  };
  filterSettings?: {
    excludeAnsweringMachine?: boolean;
    minDuration?: number;
    minReplicas?: number;
  };
}

interface ConfigureInvitationSettingsModalProps {
  invitationId: string;
  email: string;
  initialSettings?: InvitationSettings;
  onClose: () => void;
  onSave: (invitationId: string, settings: InvitationSettings) => Promise<void>;
}

export default function ConfigureInvitationSettingsModal({
  invitationId,
  email,
  initialSettings,
  onClose,
  onSave,
}: ConfigureInvitationSettingsModalProps) {
  const [settings, setSettings] = useState<InvitationSettings>(
    initialSettings ?? {},
  );
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "notifications" | "reports" | "kpi" | "filters"
  >("notifications");

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(invitationId, settings);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const updateNotificationSettings = (
    path: string[],
    value: boolean | string,
  ) => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      let current: Record<string, unknown> = newSettings;

      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      }

      current[path[path.length - 1]] = value;
      return newSettings;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <Card
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold m-0">
            Настройки для приглашенного пользователя
          </h2>
          <p className="text-sm text-gray-600 mt-1 m-0">{email}</p>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "notifications"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
            style={{ touchAction: "manipulation" }}
          >
            Уведомления
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "reports"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
            style={{ touchAction: "manipulation" }}
          >
            Отчеты
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("kpi")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "kpi"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
            style={{ touchAction: "manipulation" }}
          >
            KPI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("filters")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "filters"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
            style={{ touchAction: "manipulation" }}
          >
            Фильтры
          </button>
        </div>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3 m-0">
                  Email уведомления
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={
                        settings.notificationSettings?.email?.dailyReport ??
                        false
                      }
                      onChange={(e) =>
                        updateNotificationSettings(
                          ["notificationSettings", "email", "dailyReport"],
                          e.target.checked,
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Ежедневный отчет</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={
                        settings.notificationSettings?.email?.weeklyReport ??
                        false
                      }
                      onChange={(e) =>
                        updateNotificationSettings(
                          ["notificationSettings", "email", "weeklyReport"],
                          e.target.checked,
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Еженедельный отчет</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={
                        settings.notificationSettings?.email?.monthlyReport ??
                        false
                      }
                      onChange={(e) =>
                        updateNotificationSettings(
                          ["notificationSettings", "email", "monthlyReport"],
                          e.target.checked,
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Ежемесячный отчет</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3 m-0">
                  Telegram уведомления
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={
                        settings.notificationSettings?.telegram?.dailyReport ??
                        false
                      }
                      onChange={(e) =>
                        updateNotificationSettings(
                          ["notificationSettings", "telegram", "dailyReport"],
                          e.target.checked,
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Ежедневный отчет</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={
                        settings.notificationSettings?.telegram
                          ?.managerReport ?? false
                      }
                      onChange={(e) =>
                        updateNotificationSettings(
                          ["notificationSettings", "telegram", "managerReport"],
                          e.target.checked,
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Отчет менеджера</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={
                        settings.notificationSettings?.telegram?.skipWeekends ??
                        false
                      }
                      onChange={(e) =>
                        updateNotificationSettings(
                          ["notificationSettings", "telegram", "skipWeekends"],
                          e.target.checked,
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Пропускать выходные</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                <input
                  type="checkbox"
                  checked={
                    settings.reportSettings?.includeCallSummaries ?? false
                  }
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      reportSettings: {
                        ...prev.reportSettings,
                        includeCallSummaries: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">Включать резюме звонков</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                <input
                  type="checkbox"
                  checked={settings.reportSettings?.detailed ?? false}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      reportSettings: {
                        ...prev.reportSettings,
                        detailed: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">Детальные отчеты</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                <input
                  type="checkbox"
                  checked={settings.reportSettings?.includeAvgValue ?? false}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      reportSettings: {
                        ...prev.reportSettings,
                        includeAvgValue: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">Включать среднее значение</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                <input
                  type="checkbox"
                  checked={settings.reportSettings?.includeAvgRating ?? false}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      reportSettings: {
                        ...prev.reportSettings,
                        includeAvgRating: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">Включать средний рейтинг</span>
              </label>
            </div>
          )}

          {activeTab === "kpi" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="baseSalary" className="block text-sm mb-1">
                  Базовая зарплата
                </label>
                <input
                  id="baseSalary"
                  type="number"
                  value={settings.kpiSettings?.baseSalary ?? 0}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      kpiSettings: {
                        ...prev.kpiSettings,
                        baseSalary: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-base"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div>
                <label htmlFor="targetBonus" className="block text-sm mb-1">
                  Целевой бонус
                </label>
                <input
                  id="targetBonus"
                  type="number"
                  value={settings.kpiSettings?.targetBonus ?? 0}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      kpiSettings: {
                        ...prev.kpiSettings,
                        targetBonus: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-base"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div>
                <label htmlFor="targetTalkTime" className="block text-sm mb-1">
                  Целевое время разговора (минуты)
                </label>
                <input
                  id="targetTalkTime"
                  type="number"
                  value={settings.kpiSettings?.targetTalkTimeMinutes ?? 0}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      kpiSettings: {
                        ...prev.kpiSettings,
                        targetTalkTimeMinutes: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-base"
                  style={{ fontSize: "16px" }}
                />
              </div>
            </div>
          )}

          {activeTab === "filters" && (
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                <input
                  type="checkbox"
                  checked={
                    settings.filterSettings?.excludeAnsweringMachine ?? false
                  }
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      filterSettings: {
                        ...prev.filterSettings,
                        excludeAnsweringMachine: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">Исключить автоответчики</span>
              </label>
              <div>
                <label htmlFor="minDuration" className="block text-sm mb-1">
                  Минимальная длительность (секунды)
                </label>
                <input
                  id="minDuration"
                  type="number"
                  value={settings.filterSettings?.minDuration ?? 0}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      filterSettings: {
                        ...prev.filterSettings,
                        minDuration: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-base"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div>
                <label htmlFor="minReplicas" className="block text-sm mb-1">
                  Минимальное количество реплик
                </label>
                <input
                  id="minReplicas"
                  type="number"
                  value={settings.filterSettings?.minReplicas ?? 0}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      filterSettings: {
                        ...prev.filterSettings,
                        minReplicas: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-base"
                  style={{ fontSize: "16px" }}
                />
              </div>
            </div>
          )}
        </CardContent>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            size="touch"
            className="min-h-[44px]"
          >
            Отмена
          </Button>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={isSaving}
            size="touch"
            className="min-h-[44px]"
          >
            {isSaving ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
