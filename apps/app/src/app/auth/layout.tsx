import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вход в систему",
  description:
    "Войдите в QBS Звонки — сервис аналитики телефонных разговоров с помощью искусственного интеллекта. Регистрация и авторизация.",
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
