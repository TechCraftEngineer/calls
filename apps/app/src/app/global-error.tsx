"use client";

import { paths } from "@calls/config";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Global error:", error);
    }
  }, [error]);

  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: "Inter, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F5F5F7",
            padding: "24px",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <h1
              style={{
                marginBottom: "16px",
                fontSize: "24px",
                fontWeight: 700,
                color: "#111",
              }}
            >
              Критическая ошибка
            </h1>
            <p
              style={{
                marginBottom: "32px",
                color: "#666",
                lineHeight: 1.5,
              }}
            >
              Приложение столкнулось с серьёзной ошибкой. Пожалуйста, обновите
              страницу или вернитесь на главную.
            </p>
            <div
              style={{ display: "flex", gap: "16px", justifyContent: "center" }}
            >
              <button
                type="button"
                onClick={reset}
                style={{
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#FFD600",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Попробовать снова
              </button>
              <a
                href={paths.root}
                style={{
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  backgroundColor: "white",
                  fontWeight: 600,
                  color: "#333",
                  textDecoration: "none",
                }}
              >
                На главную
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
