"use client";

import { Card, CardContent, CardHeader, Input, Textarea } from "@calls/ui";
import type { PromptSectionProps } from "./types";

export default function PromptSection({
  key: promptKey,
  title,
  prompt,
  onPromptChange,
}: PromptSectionProps) {
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{[^}]+\}/g);
    return matches ? [...new Set(matches)] : [];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  const variables = extractVariables(prompt.value || "");
  const isTokenOnly = false;

  return (
    <Card className="card mb-6">
      <CardHeader className="p-0 pb-0">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="section-title m-0">{title}</h3>
            {prompt.updated_at && (
              <div className="text-xs text-[#999] mt-1">
                Обновлено: {formatDate(prompt.updated_at)}
              </div>
            )}
          </div>
          <span className="text-lg cursor-pointer">✏️</span>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-0">
        {isTokenOnly ? (
          <div className="filter-item">
            <label className="filter-label">Токен</label>
            <Input
              type="password"
              className="text-input"
              value={prompt.value || ""}
              onChange={onPromptChange(promptKey, "value")}
              placeholder="Введите токен бота"
              autoComplete="off"
            />
          </div>
        ) : (
          <>
            {variables.length > 0 && (
              <div className="mb-4">
                <div className="filter-label mb-2">Доступные переменные:</div>
                <div className="flex gap-2 flex-wrap">
                  {variables.map((varName, idx) => (
                    <span
                      key={idx}
                      className="py-1 px-3 bg-[#F5F5F7] rounded-2xl text-xs font-mono text-[#333] border border-[#E0E0E0]"
                    >
                      {varName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="filter-item mb-4">
              <label className="filter-label">ОПИСАНИЕ</label>
              <Input
                type="text"
                className="text-input"
                value={prompt.description || ""}
                onChange={onPromptChange(promptKey, "description")}
                placeholder="Описание промпта"
              />
            </div>

            <div className="filter-item">
              <label className="filter-label">ТЕКСТ ПРОМПТА</label>
              <Textarea
                className="text-input min-h-[300px] resize-y font-mono text-[13px] leading-relaxed"
                value={prompt.value || ""}
                onChange={onPromptChange(promptKey, "value")}
                placeholder="Введите текст промпта"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
