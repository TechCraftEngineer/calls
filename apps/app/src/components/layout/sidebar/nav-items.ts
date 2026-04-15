import { BarChart3, Home, Settings, Users, type LucideIcon } from "lucide-react";
import { paths } from "@calls/config";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const navItems: NavItem[] = [
  {
    title: "Звонки",
    href: paths.dashboard.root,
    icon: Home,
  },
  {
    title: "Статистика",
    href: paths.statistics.root,
    icon: BarChart3,
  },
];

export const memberNavItems: NavItem[] = [
  {
    title: "Настройки отчетов",
    href: paths.statistics.settings,
    icon: Settings,
  },
];

export const adminNavItems: NavItem[] = [
  {
    title: "Пользователи",
    href: paths.users.root,
    icon: Users,
  },
  {
    title: "Настройки",
    href: paths.settings.root,
    icon: Settings,
  },
];

export const roleTranslations: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  member: "Участник",
};
