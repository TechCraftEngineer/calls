"use client";

import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@calls/ui";
import { Download, MessageSquare } from "lucide-react";
import sanitizeHtml from "sanitize-html";
import { AudioComparisonWaveformPlayer } from "../audio-players/audio-comparison-waveform-player";
import type { TranscriptDetail } from "./types";

interface Message {
  speaker: string;
  text: string;
  isOperator: boolean;
}

interface TranscriptSectionProps {
  callId: string;
  transcript: TranscriptDetail | null;
  onDownloadTxt: () => void;
  onDownloadRecording?: () => void;
  downloadingRecording?: boolean;
  managerName?: string;
}

function parseMessages(transcript: TranscriptDetail | null, managerName?: string): Message[] {
  const sourceText = transcript?.text;
  if (!sourceText) return [];

  const speakerMapping = transcript?.speakerMapping;

  return sourceText
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      const parts = line.split(":");
      let speaker = "СИСТЕМА";
      let text = line;

      if (parts.length >= 2) {
        const rawSpeaker = parts[0].trim().replace(/\*\*/g, "");
        // Применяем маппинг спикера, если есть
        speaker = speakerMapping?.[rawSpeaker] ?? rawSpeaker;
        text = parts.slice(1).join(":").trim();
      }

      const isOperator = Boolean(
        speaker.toLowerCase().includes("оператор") ||
          speaker.toLowerCase().includes("менеджер") ||
          (managerName && speaker.includes(managerName)),
      );

      const formattedText = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

      return { speaker, text: formattedText, isOperator };
    });
}

export default function TranscriptSection({
  callId,
  transcript,
  onDownloadTxt,
  onDownloadRecording,
  downloadingRecording,
  managerName,
}: TranscriptSectionProps) {
  const messages = parseMessages(transcript, managerName);

  return (
    <Card className="flex min-h-[600px] max-h-[800px] flex-col overflow-hidden border-border/60">
      <div className="border-b border-border/60 px-6 py-4">
        <AudioComparisonWaveformPlayer
          callId={callId}
          onDownloadRecording={onDownloadRecording}
          downloadingRecording={downloadingRecording}
        />
      </div>
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <CardTitle className="mb-0 flex items-center gap-2 text-base font-semibold">
            <MessageSquare className="text-muted-foreground size-4" />
            Расшифровка
          </CardTitle>
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

      <CardContent className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
        {messages.length > 0 ? (
          messages.map((m, i) => (
            <div key={i} className="flex max-w-full gap-3 self-start">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback
                  className={cn(
                    "text-xs font-medium",
                    m.isOperator
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "bg-muted text-muted-foreground ring-1 ring-border/50",
                  )}
                >
                  {m.speaker.includes("АВТООТВЕТЧИК") ? "🤖" : m.speaker[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 items-start">
                <span className="text-muted-foreground text-xs font-medium">{m.speaker}</span>
                <div
                  className={cn(
                    "rounded-lg border-l-4 px-4 py-2.5 text-sm leading-relaxed",
                    m.isOperator
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-muted-foreground/40 bg-muted/50 text-foreground",
                  )}
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
          <Empty className="flex-1 py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-muted/50">
                <MessageSquare className="text-muted-foreground size-8" />
              </EmptyMedia>
              <EmptyDescription>Текст отсутствует</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
