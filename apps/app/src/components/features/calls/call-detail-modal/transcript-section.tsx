"use client";

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
    <div className="transcript-card">
      <div className="transcript-header flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="m-0 text-base font-bold flex items-center gap-2">
            <span className="text-lg">💬</span> Расшифровка
          </h3>
          {transcript?.raw_text && (
            <div className="flex bg-gray-100 p-0.5 rounded-md ml-2">
              <button
                onClick={() => onShowRawChange(false)}
                className={`py-1 px-2.5 text-[11px] border-none rounded cursor-pointer transition-all ${
                  !showRaw
                    ? "bg-white text-[#111] font-semibold shadow-sm"
                    : "bg-transparent text-gray-500"
                }`}
              >
                Обработка
              </button>
              <button
                onClick={() => onShowRawChange(true)}
                className={`py-1 px-2.5 text-[11px] border-none rounded cursor-pointer transition-all ${
                  showRaw
                    ? "bg-white text-[#111] font-semibold shadow-sm"
                    : "bg-transparent text-gray-500"
                }`}
              >
                Оригинал
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className="ghost-btn h-8 text-xs py-0 px-3 flex items-center gap-1.5"
          onClick={onDownloadTxt}
        >
          <span>📥</span> Скачать .txt
        </button>
      </div>
      <div className="message-list">
        {messages.length > 0 ? (
          messages.map((m, i) => (
            <div
              key={i}
              className={`message-item ${m.isOperator ? "is-operator" : ""}`}
            >
              <div className="avatar-circle-sm">
                {m.speaker.includes("АВТООТВЕТЧИК")
                  ? "🤖"
                  : m.speaker[0]?.toUpperCase() || "👤"}
              </div>
              <div className="message-content">
                <div className="speaker-name-sm">{m.speaker}</div>
                <div
                  className="speech-bubble"
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
          <div className="text-center py-10 text-gray-400">
            Текст отсутствует
          </div>
        )}
      </div>
    </div>
  );
}
