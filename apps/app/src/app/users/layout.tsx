import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Пользователи",
  description:
    "Управление пользователями системы. Добавление, редактирование и настройка доступа.",
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
