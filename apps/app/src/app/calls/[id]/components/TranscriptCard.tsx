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
import { useMemo, useState } from "react";
import sanitizeHtml from "sanitize-html";
import type { CallDetail, TranscriptDetail } from "../types";

interface Props {
  call: CallDetail;
  transcript: TranscriptDetail | null;
}

export function TranscriptCard({ call, transcript }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  const messages = useMemo(() => {
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

        const isOperator =
          speaker.toLowerCase().includes("оператор") ||
          speaker.toLowerCase().includes("менеджер") ||
          (call?.manager_name && speaker.includes(call.manager_name));

        const formattedText = text.replace(
          /\*\*(.*?)\*\*/g,
          "<strong>$1</strong>",
        );

        return { speaker, text: formattedText, isOperator };
      });
  }, [transcript, call, showRaw]);

  const handleDownloadTxt = () => {
    if (!transcript?.text) return;
    const element = document.createElement("a");
    const file = new Blob([transcript.text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `call_${call?.number || call?.id}_transcript.txt`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <Card className="transcript-card p-0! gap-0! py-0!">
      <CardHeader className="transcript-header flex flex-row justify-between items-center mb-4 pb-4 border-b border-[#EEE] px-6 pt-5">
        <div className="flex items-center gap-3">
          <CardTitle className="m-0 text-base font-bold flex items-center gap-2">
            <span className="text-lg">💬</span> Расшифровка
          </CardTitle>

          {transcript?.raw_text && (
            <Tabs
              value={showRaw ? "raw" : "processed"}
              onValueChange={(v) => setShowRaw(v === "raw")}
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
          onClick={handleDownloadTxt}
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
          <div className="text-center py-10 text-[#999]">
            Текст отсутствует
          </div>
        )}
      </CardContent>
    </Card>
  );
}
