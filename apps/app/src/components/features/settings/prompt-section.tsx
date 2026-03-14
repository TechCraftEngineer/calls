"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@calls/ui";
import type { PromptSectionProps } from "./types";

export default function PromptSection({
  title,
  prompt,
  onPromptChange,
}: PromptSectionProps) {
  const promptKey = prompt.key;
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
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {prompt.updated_at && (
            <span className="text-xs text-muted-foreground">
              Обновлено: {formatDate(prompt.updated_at)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTokenOnly ? (
          <div className="space-y-2">
            <Label
              htmlFor={`prompt-${promptKey}`}
              className="text-xs text-muted-foreground"
            >
              Токен
            </Label>
            <Input
              id={`prompt-${promptKey}`}
              type="password"
              value={prompt.value || ""}
              onChange={onPromptChange(promptKey, "value")}
              placeholder="Введите токен бота"
              autoComplete="off"
              className="h-9"
            />
          </div>
        ) : (
          <>
            {variables.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Доступные переменные
                </Label>
                <div className="flex flex-wrap gap-2">
                  {variables.map((varName, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-full border border-border/60 bg-muted px-3 py-1 text-xs font-mono"
                    >
                      {varName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor={`prompt-${promptKey}-description`}
                className="text-xs text-muted-foreground"
              >
                Описание
              </Label>
              <Input
                id={`prompt-${promptKey}-description`}
                type="text"
                value={prompt.description || ""}
                onChange={onPromptChange(promptKey, "description")}
                placeholder="Описание промпта"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={`prompt-${promptKey}-value`}
                className="text-xs text-muted-foreground"
              >
                Текст промпта
              </Label>
              <Textarea
                id={`prompt-${promptKey}-value`}
                value={prompt.value || ""}
                onChange={onPromptChange(promptKey, "value")}
                placeholder="Введите текст промпта"
                className="min-h-[300px] resize-y font-mono text-[13px] leading-relaxed"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
