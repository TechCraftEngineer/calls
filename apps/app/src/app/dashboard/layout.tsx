import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Звонки",
  description:
    "Список телефонных звонков с фильтрами. Просмотр транскрипций, оценок и рекомендаций.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
