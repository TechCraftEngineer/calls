import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Настройка",
  description: "Первичная настройка системы. Подключение АТС, настройка интеграций.",
};

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
