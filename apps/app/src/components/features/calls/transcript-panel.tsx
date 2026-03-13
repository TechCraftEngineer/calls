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
  Tabs,
  TabsList,
  TabsTrigger,
} from "@calls/ui";
import sanitizeHtml from "sanitize-html";

interface Message {
  speaker: string;
  text: string;
  isOperator: boolean;
}

interface TranscriptPanelProps {
  messages: Message[];
  hasRawText: boolean;
  showRaw: boolean;
  onToggleRaw: (v: boolean) => void;
  onDownload: () => void;
}

export default function TranscriptPanel({
  messages,
  hasRawText,
  showRaw,
  onToggleRaw,
  onDownload,
}: TranscriptPanelProps) {
  return (
    <Card className="transcript-card p-0! gap-0! py-0!">
      <CardHeader className="transcript-header flex flex-row justify-between items-center mb-4 pb-4 border-b border-[#EEE] px-6 pt-5">
        <div className="flex items-center gap-3">
          <CardTitle className="m-0 text-base font-bold flex items-center gap-2">
            <span className="text-lg">💬</span> Расшифровка
          </CardTitle>

          {hasRawText && (
            <Tabs
              value={showRaw ? "raw" : "processed"}
              onValueChange={(v) => onToggleRaw(v === "raw")}
            >
              <TabsList className="bg-[#F0F0F0] p-0.5 rounded-md ml-2 h-auto">
                <TabsTrigger
                  value="processed"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#111] data-[state=active]:font-semibold data-[state=active]:shadow-sm text-[#666] px-2.5 py-1 text-[11px] rounded"
                >
                  Обработка
                </TabsTrigger>
                <TabsTrigger
                  value="raw"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#111] data-[state=active]:font-semibold data-[state=active]:shadow-sm text-[#666] px-2.5 py-1 text-[11px] rounded"
                >
                  Оригинал
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        <Button
          variant="ghost"
          className="ghost-btn h-8 text-xs px-3"
          onClick={onDownload}
        >
          <span>📥</span> Скачать .txt
        </Button>
      </CardHeader>

      <CardContent className="message-list p-6 overflow-y-auto flex-1 flex flex-col gap-4 bg-[#FAFAFA]">
        {messages.length > 0 ? (
          messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "message-item flex gap-3 max-w-[85%]",
                m.isOperator && "self-start",
              )}
            >
              <Avatar className="size-8 shrink-0 rounded-full bg-[#EEE]">
                <AvatarFallback className="bg-[#EEE] text-[#999] text-xs font-bold">
                  {m.speaker.includes("АВТООТВЕТЧИК")
                    ? "🤖"
                    : m.speaker[0]?.toUpperCase() || "👤"}
                </AvatarFallback>
              </Avatar>
              <div className="message-content flex flex-col gap-1">
                <div className="speaker-name-sm">{m.speaker}</div>
                <div
                  className="speech-bubble"
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
          <div className="text-center py-10 text-[#999]">Текст отсутствует</div>
        )}
      </CardContent>
    </Card>
  );
}
