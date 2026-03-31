import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@calls/ui";
// TODO: ChatWidget временно отключен до 2026-04-15 (план восстановления после стабилизации сценариев чата).
import { AuthProvider } from "@/components/features/misc/auth-provider";
import { WorkspaceProvider } from "@/components/features/workspaces/workspace-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ORPCReactProvider } from "@/orpc/react";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://zvonki.qbsoft.ru");

export const metadata: Metadata = {
  metadataBase: new URL(
    typeof siteUrl === "string" && siteUrl.startsWith("http")
      ? siteUrl
      : "https://zvonki.qbsoft.ru",
  ),
  title: {
    default: "QBS Звонки — Аналитика телефонных разговоров с помощью ИИ",
    template: "%s | QBS Звонки",
  },
  description:
    "Сервис транскрибации и анализа телефонных звонков. Автоматическая расшифровка, оценка качества общения и отчёты для менеджеров. QBS Звонки.",
  keywords: [
    "аналитика звонков",
    "транскрибация звонков",
    "ИИ анализ разговоров",
    "качество обслуживания",
    "колл-центр",
    "QBS Звонки",
    "QBS",
  ],
  authors: [{ name: "QBS", url: "https://qbs.ru" }],
  creator: "QBS",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "QBS Звонки",
    title: "QBS Звонки — Аналитика телефонных разговоров с помощью ИИ",
    description:
      "Сервис транскрибации и анализа телефонных звонков. Автоматическая расшифровка, оценка качества общения и отчёты.",
  },
  twitter: {
    card: "summary_large_image",
    title: "QBS Звонки — Аналитика телефонных разговоров с помощью ИИ",
    description:
      "Сервис транскрибации и анализа телефонных звонков. Автоматическая расшифровка и оценка качества.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} light`}>
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <ErrorBoundary>
              <ORPCReactProvider>
                <WorkspaceProvider>
                  {children}
                  {/* TODO: ChatWidget временно отключен до 2026-04-15 */}
                </WorkspaceProvider>
              </ORPCReactProvider>
              <Toaster />
            </ErrorBoundary>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
