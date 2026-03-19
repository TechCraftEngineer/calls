import type { LucideIcon } from "lucide-react";
import { Database, Mic, PhoneCall, Users, Webhook } from "lucide-react";

export const STORAGE_KEYS = {
  tab: "settings-pbx-megafon-tab",
  employeeSearch: "settings-pbx-megafon-employee-search",
  numberSearch: "settings-pbx-megafon-number-search",
} as const;

export const SYNC_OPTIONS = [
  [
    "megapbx_sync_employees",
    "Сотрудники",
    "Справочник сотрудников из АТС",
    Users,
  ],
  ["megapbx_sync_numbers", "Номера", "Внешние и внутренние номера", Database],
  [
    "megapbx_sync_calls",
    "Звонки",
    "Импорт истории звонков в систему",
    PhoneCall,
  ],
  ["megapbx_sync_recordings", "Записи", "Загрузка и привязка аудиофайлов", Mic],
  [
    "megapbx_webhooks_enabled",
    "Вебхуки",
    "Быстрый запуск синхронизации по событию",
    Webhook,
  ],
] as const satisfies readonly [string, string, string, LucideIcon][];

export const QUICK_ACTIONS = [
  ["directory", "Справочник", "Сотрудники и номера", Database],
  ["calls", "Звонки", "Импорт истории вызовов", PhoneCall],
  ["recordings", "Записи", "Загрузка аудио по звонкам", Mic],
] as const satisfies readonly [
  "directory" | "calls" | "recordings",
  string,
  string,
  LucideIcon,
][];
