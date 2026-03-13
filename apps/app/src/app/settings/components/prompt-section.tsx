"use client";

import type { PromptSectionProps } from "../types/settings";

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
    <section className="card" style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h3 className="section-title" style={{ margin: 0 }}>
            {title}
          </h3>
          {prompt.updated_at && (
            <div
              style={{
                fontSize: "12px",
                color: "#999",
                marginTop: "4px",
              }}
            >
              Обновлено: {formatDate(prompt.updated_at)}
            </div>
          )}
        </div>
        <span style={{ fontSize: "18px", cursor: "pointer" }}>✏️</span>
      </div>

      {isTokenOnly ? (
        <div className="filter-item">
          <label className="filter-label">Токен</label>
          <input
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
            <div style={{ marginBottom: "16px" }}>
              <div className="filter-label" style={{ marginBottom: "8px" }}>
                Доступные переменные:
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                {variables.map((varName, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: "4px 12px",
                      background: "#F5F5F7",
                      borderRadius: "16px",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      color: "#333",
                      border: "1px solid #E0E0E0",
                    }}
                  >
                    {varName}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="filter-item" style={{ marginBottom: "16px" }}>
            <label className="filter-label">ОПИСАНИЕ</label>
            <input
              type="text"
              className="text-input"
              value={prompt.description || ""}
              onChange={onPromptChange(promptKey, "description")}
              placeholder="Описание промпта"
            />
          </div>

          <div className="filter-item">
            <label className="filter-label">ТЕКСТ ПРОМПТА</label>
            <textarea
              className="text-input"
              value={prompt.value || ""}
              onChange={onPromptChange(promptKey, "value")}
              placeholder="Введите текст промпта"
              style={{
                minHeight: "300px",
                resize: "vertical",
                fontFamily: "monospace",
                fontSize: "13px",
                lineHeight: "1.6",
              }}
            />
          </div>
        </>
      )}
    </section>
  );
}
