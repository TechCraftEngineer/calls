"use client";

import { Card, CardContent, CardHeader, Input } from "@calls/ui";
import type { IntegrationsSectionProps } from "./types";

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
          <div className="p-4 bg-[#f5f7fa] rounded-lg">
            <h4 className="m-0 mb-3 text-sm font-bold">
              Megafon FTP (загрузка записей с PBX)
            </h4>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <div className="filter-item">
                <label className="filter-label" htmlFor="megafon-ftp-host">
                  Host
                </label>
                <Input
                  id="megafon-ftp-host"
                  type="text"
                  className="text-input"
                  value={prompts.megafon_ftp_host?.value ?? ""}
                  onChange={onPromptChange("megafon_ftp_host", "value")}
                  placeholder="records.megapbx.ru"
                  autoComplete="off"
                  aria-label="Megafon FTP host"
                />
              </div>
              <div className="filter-item">
                <label className="filter-label" htmlFor="megafon-ftp-user">
                  User
                </label>
                <Input
                  id="megafon-ftp-user"
                  type="text"
                  className="text-input"
                  value={prompts.megafon_ftp_user?.value ?? ""}
                  onChange={onPromptChange("megafon_ftp_user", "value")}
                  placeholder="FTP пользователь"
                  autoComplete="off"
                  aria-label="Megafon FTP пользователь"
                />
              </div>
              <div className="filter-item">
                <label className="filter-label" htmlFor="megafon-ftp-password">
                  Password
                </label>
                <Input
                  id="megafon-ftp-password"
                  type="password"
                  className="text-input"
                  value={prompts.megafon_ftp_password?.value ?? ""}
                  onChange={onPromptChange("megafon_ftp_password", "value")}
                  placeholder="FTP пароль"
                  autoComplete="off"
                  aria-label="Megafon FTP пароль"
                />
              </div>
            </div>
          </div>

          {/* Telegram Bot */}
          <div className="p-4 bg-[#f5f7fa] rounded-lg">
            <h4 className="m-0 mb-3 text-sm font-bold">
              Telegram Bot (для отчётов)
            </h4>
            <div className="filter-item">
              <label className="filter-label" htmlFor="telegram-bot-token">
                Token
              </label>
              <Input
                id="telegram-bot-token"
                type="password"
                className="text-input"
                value={prompts.telegram_bot_token?.value ?? ""}
                onChange={onPromptChange("telegram_bot_token", "value")}
                placeholder="Введите токен бота"
                autoComplete="off"
                aria-label="Telegram Bot Token"
              />
            </div>
          </div>

          {/* MAX Bot */}
          <div className="p-4 bg-[#f5f7fa] rounded-lg">
            <h4 className="m-0 mb-3 text-sm font-bold">
              MAX Bot (для отчётов)
            </h4>
            <div className="filter-item">
              <label className="filter-label" htmlFor="max-bot-token">
                Token
              </label>
              <Input
                id="max-bot-token"
                type="password"
                className="text-input"
                value={prompts.max_bot_token?.value ?? ""}
                onChange={onPromptChange("max_bot_token", "value")}
                placeholder="Введите токен бота"
                autoComplete="off"
                aria-label="MAX Bot Token"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
