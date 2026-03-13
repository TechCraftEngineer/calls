"use client";

import type { BackupSectionProps } from "../types/settings";

export default function BackupSection({
  backupLoading,
  onBackup,
}: BackupSectionProps) {
  return (
    <section className="card" style={{ marginBottom: "24px" }}>
      <div
        className="section-title"
        style={{
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "16px" }}>💾</span> Резервная копия базы
      </div>
      <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
        Создать копию базы данных и сохранить её на сервере.
      </p>
      <button
        type="button"
        onClick={onBackup}
        disabled={backupLoading}
        style={{
          background: backupLoading
            ? "#CCC"
            : "linear-gradient(135deg, #2d7d46 0%, #1e5c34 100%)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "12px 24px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: backupLoading ? "not-allowed" : "pointer",
        }}
      >
        {backupLoading ? "Создание копии…" : "Копия базы"}
      </button>
    </section>
  );
}
