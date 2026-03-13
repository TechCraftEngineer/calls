import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Настройки",
  description:
    "Управление параметрами ИИ, промптами и конфигурацией системы аналитики звонков.",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
