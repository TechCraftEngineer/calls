"use client";

import { Card, CardContent, CardHeader, Input } from "@calls/ui";
import { INTEGRATION_KEYS } from "../constants/prompts";
import type { IntegrationsSectionProps } from "../types/settings";
import { createPromptChangeHandler } from "../utils/prompt-updater";

export default function IntegrationsSection({
  prompts,
  onPromptChange,
}: IntegrationsSectionProps) {
  return (
    <Card className="card mb-6">
      <CardHeader className="p-0 pb-6">
        <div className="section-title flex items-center gap-2">
          <span className="text-base">🔌</span> Интеграции workspace
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col gap-7">
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
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <div className="filter-item">
                <label className="filter-label">Host</label>
                <Input
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
                <Input
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
                <Input
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
              <Input
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
              <Input
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
      </CardContent>
    </Card>
  );
}
