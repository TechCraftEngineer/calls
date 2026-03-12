import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import ChatWidget from "@/components/chat-widget";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "QBS Звонки - Сервис ИИ аналитики телефонных разговоров",
  description: "Call transcription and analysis dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <ChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
