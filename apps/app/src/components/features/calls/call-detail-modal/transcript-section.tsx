"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@calls/ui";
import sanitizeHtml from "sanitize-html";
import type { TranscriptDetail } from "./types";

interface Message {
  speaker: string;
  text: string;
  isOperator: boolean;
}

interface TranscriptSectionProps {
  transcript: TranscriptDetail | null;
  showRaw: boolean;
  onShowRawChange: (show: boolean) => void;
  onDownloadTxt: () => void;
  managerName?: string;
}

function parseMessages(
  transcript: TranscriptDetail | null,
  showRaw: boolean,
  managerName?: string,
): Message[] {
  const sourceText = showRaw
    ? transcript?.raw_text || transcript?.text
    : transcript?.text;
  if (!sourceText) return [];

  return sourceText
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      const parts = line.split(":");
      let speaker = "СИСТЕМА";
      let text = line;

      if (parts.length >= 2) {
        speaker = parts[0].trim().replace(/\*\*/g, "");
        text = parts.slice(1).join(":").trim();
      }

      const isOperator = Boolean(
        speaker.toLowerCase().includes("оператор") ||
          speaker.toLowerCase().includes("менеджер") ||
          (managerName && speaker.includes(managerName)),
      );

      const formattedText = text.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>",
      );

      return { speaker, text: formattedText, isOperator };
    });
}

export default function TranscriptSection({
  transcript,
  showRaw,
  onShowRawChange,
  onDownloadTxt,
  managerName,
}: TranscriptSectionProps) {
  const messages = parseMessages(transcript, showRaw, managerName);

  return (
    <Card className="flex min-h-[600px] max-h-[800px] flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b px-6 py-5">
        <div className="flex items-center gap-3">
          <CardTitle className="mb-0 flex items-center gap-2 text-base">
            <span className="text-lg">💬</span> Расшифровка
          </CardTitle>
          {transcript?.raw_text && (
            <div className="bg-muted flex rounded-md p-0.5">
              <Button
                variant={showRaw ? "ghost" : "secondary"}
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => onShowRawChange(false)}
              >
                Обработка
              </Button>
              <Button
                variant={showRaw ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => onShowRawChange(true)}
              >
                Оригинал
              </Button>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-8 gap-1.5 px-3 text-xs"
          onClick={onDownloadTxt}
        >
          <span>📥</span> Скачать .txt
        </Button>
      </CardHeader>
      <CardContent className="bg-muted/30 flex flex-1 flex-col gap-4 overflow-y-auto p-6">
        {messages.length > 0 ? (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex max-w-[85%] gap-3 ${m.isOperator ? "self-start" : "self-end"}`}
            >
              <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {m.speaker.includes("АВТООТВЕТЧИК")
                  ? "🤖"
                  : m.speaker[0]?.toUpperCase() || "👤"}
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-muted-foreground text-[11px] font-bold uppercase tracking-wide">
                  {m.speaker}
                </div>
                <div
                  className="bg-background border-border rounded-bl-2xl rounded-br-2xl rounded-tl-sm rounded-tr-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(m.text, {
                      allowedTags: ["b", "i", "em", "strong", "br", "p"],
                      allowedAttributes: {},
                      disallowedTagsMode: "discard",
                    }),
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground py-10 text-center">
            Текст отсутствует
          </div>
        )}
      </CardContent>
    </Card>
  );
}
