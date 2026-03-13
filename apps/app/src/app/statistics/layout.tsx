import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Статистика",
  description:
    "Статистика звонков и эффективность работы менеджеров. KPI и отчёты.",
};

export default function StatisticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
