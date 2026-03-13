"use client";

import { paths } from "@calls/config";
import Link from "next/link";
import type { TelegramSectionProps } from "../types/settings";

export default function TelegramSection({
  sendTestLoading,
  sendTestMessage,
  onSendTest,
}: TelegramSectionProps) {
  return (
    <section className="card" style={{ marginBottom: "24px" }}>
      <div
        className="section-title"
        style={{
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "18px" }}>📊</span> Отчёты в Telegram
      </div>
      <p style={{ marginBottom: "16px", fontSize: "14px", color: "#555" }}>
        Подписки на ежедневный/еженедельный/ежемесячный отчёт и опция «не
        отправлять в выходные» настраиваются на странице{" "}
        <Link
          href={paths.statistics.settings}
          style={{ color: "#FF6B35", fontWeight: 600 }}
        >
          Статистика
        </Link>{" "}
        → вкладка «Настройки отчетов».
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          disabled={sendTestLoading}
          onClick={onSendTest}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "8px",
            background: sendTestLoading
              ? "#ccc"
              : "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",
            color: "white",
            fontWeight: 600,
            cursor: sendTestLoading ? "not-allowed" : "pointer",
            fontSize: "14px",
          }}
        >
          {sendTestLoading
            ? "Отправка…"
            : "Отправить тестовый отчёт в Telegram"}
        </button>
        <Link
          href={paths.statistics.settings}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid #FF6B35",
            color: "#FF6B35",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          Перейти к настройкам отчётов
        </Link>
        {sendTestMessage && (
          <span
            style={{
              color:
                sendTestMessage.includes("успешно") ||
                sendTestMessage.includes("Отправка завершена")
                  ? "#4CAF50"
                  : "#FF5252",
              fontSize: "14px",
            }}
          >
            {sendTestMessage}
          </span>
        )}
      </div>
    </section>
  );
}
