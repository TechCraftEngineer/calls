"use client";

import { INTEGRATION_KEYS } from "../constants/prompts";
import type { IntegrationsSectionProps } from "../types/settings";
import { createPromptChangeHandler } from "../utils/prompt-updater";

export default function IntegrationsSection({
  prompts,
  onPromptChange,
}: IntegrationsSectionProps) {
  return (
    <section className="card" style={{ marginBottom: "24px" }}>
      <div
        className="section-title"
        style={{
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "16px" }}>🔌</span> Интеграции workspace
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {/* Megafon FTP */}
        <div
          style={{
            padding: "16px",
            background: "#f5f7fa",
            borderRadius: "8px",
          }}
        >
          <h4
            style={{
              margin: "0 0 12px",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Megafon FTP (загрузка записей с PBX)
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            <div className="filter-item">
              <label className="filter-label">Host</label>
              <input
                type="text"
                className="text-input"
                value={prompts.megafon_ftp_host?.value ?? ""}
                onChange={onPromptChange("megafon_ftp_host", "value")}
                placeholder="records.megapbx.ru"
                autoComplete="off"
              />
            </div>
            <div className="filter-item">
              <label className="filter-label">User</label>
              <input
                type="text"
                className="text-input"
                value={prompts.megafon_ftp_user?.value ?? ""}
                onChange={onPromptChange("megafon_ftp_user", "value")}
                placeholder="FTP пользователь"
                autoComplete="off"
              />
            </div>
            <div className="filter-item">
              <label className="filter-label">Password</label>
              <input
                type="password"
                className="text-input"
                value={prompts.megafon_ftp_password?.value ?? ""}
                onChange={onPromptChange("megafon_ftp_password", "value")}
                placeholder="FTP пароль"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {/* Telegram Bot */}
        <div
          style={{
            padding: "16px",
            background: "#f5f7fa",
            borderRadius: "8px",
          }}
        >
          <h4
            style={{
              margin: "0 0 12px",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Telegram Bot (для отчётов)
          </h4>
          <div className="filter-item">
            <label className="filter-label">Token</label>
            <input
              type="password"
              className="text-input"
              value={prompts.telegram_bot_token?.value ?? ""}
              onChange={onPromptChange("telegram_bot_token", "value")}
              placeholder="Введите токен бота"
              autoComplete="off"
            />
          </div>
        </div>

        {/* MAX Bot */}
        <div
          style={{
            padding: "16px",
            background: "#f5f7fa",
            borderRadius: "8px",
          }}
        >
          <h4
            style={{
              margin: "0 0 12px",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            MAX Bot (для отчётов)
          </h4>
          <div className="filter-item">
            <label className="filter-label">Token</label>
            <input
              type="password"
              className="text-input"
              value={prompts.max_bot_token?.value ?? ""}
              onChange={onPromptChange("max_bot_token", "value")}
              placeholder="Введите токен бота"
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
