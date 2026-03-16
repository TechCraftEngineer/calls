"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@calls/ui";
import { Download, MessageSquare } from "lucide-react";
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
    <Card className="flex min-h-[600px] max-h-[800px] flex-col overflow-hidden border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <CardTitle className="mb-0 flex items-center gap-2 text-base font-semibold">
            <MessageSquare className="text-muted-foreground size-4" />
            Расшифровка
          </CardTitle>
          {transcript?.raw_text && (
            <div className="bg-muted/50 flex rounded-md p-0.5">
              <Button
                variant={showRaw ? "ghost" : "secondary"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => onShowRawChange(false)}
              >
                Обработка
              </Button>
              <Button
                variant={showRaw ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
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
          className="text-muted-foreground h-8 gap-1.5 px-3 text-xs hover:bg-accent hover:text-accent-foreground"
          onClick={onDownloadTxt}
        >
          <Download className="size-3.5" />
          Скачать .txt
        </Button>
      </CardHeader>
      <CardContent className="bg-muted/20 flex flex-1 flex-col gap-4 overflow-y-auto p-6">
        {messages.length > 0 ? (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex max-w-[85%] gap-2 ${m.isOperator ? "self-start flex-row" : "self-end flex-row-reverse"}`}
            >
              <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ring-1 ring-border/60">
                {m.speaker[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex min-w-0 flex-col gap-1 text-left">
                <div className="text-muted-foreground text-xs font-medium">
                  {m.speaker}
                </div>
                <div
                  className="bg-background border-border/60 rounded-lg border px-4 py-3 text-left text-sm leading-relaxed shadow-sm"
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
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-16">
            <MessageSquare className="size-10 opacity-40" />
            <p className="text-sm">Текст отсутствует</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
