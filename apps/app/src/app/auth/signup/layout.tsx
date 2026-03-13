import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Регистрация",
  description:
    "Создайте аккаунт в QBS Звонки — сервисе аналитики телефонных разговоров с помощью искусственного интеллекта.",
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
