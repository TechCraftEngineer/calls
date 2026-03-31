import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вход в систему",
  description:
    "Войдите в личный кабинет QBS Звонки. Доступ к аналитике телефонных разговоров и отчётам.",
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
