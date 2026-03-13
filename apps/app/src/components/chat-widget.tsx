"use client";

import { useEffect, useRef, useState } from "react";
import { type ChatMessage, sendChatMessage } from "@/lib/chat";

const CONTEXT_GENERAL = "general" as const;
const CONTEXT_CALLS = "calls" as const;
type ContextMode = typeof CONTEXT_GENERAL | typeof CONTEXT_CALLS;

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contextMode, setContextMode] = useState<ContextMode>(CONTEXT_GENERAL);
  const [startDate, setStartDate] = useState(() =>
    formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
  );
  const [endDate, setEndDate] = useState(() => formatDate(new Date()));
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || loading) return;
    setInputValue("");
    setError(null);
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const history: ChatMessage[] = [...messages, userMsg];
      const content = await sendChatMessage(
        history,
        contextMode,
        contextMode === CONTEXT_CALLS ? startDate : undefined,
        contextMode === CONTEXT_CALLS ? endDate : undefined,
      );
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (e: unknown) {
      const errMsg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : e instanceof Error
            ? e.message
            : "Ошибка сети";
      setError(String(errMsg));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Ошибка: ${errMsg}` },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* FAB - Ear style */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Закрыть чат" : "Открыть чат"}
        className={`fixed top-1/2 -translate-y-1/2 w-12 h-[120px] rounded-l-2xl rounded-r-none bg-[#FFD600] shadow-[_-4px_0_12px_rgba(0,0,0,0.15)] border-none z-[9998] flex flex-col items-center justify-center py-4 px-1.5 gap-2 transition-[right,transform] duration-300 ease-out ${
          open ? "right-[-60px]" : "right-0"
        }`}
        onMouseEnter={(e) => {
          if (!open)
            e.currentTarget.style.transform =
              "translateY(-50%) translateX(-4px)";
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.transform = "translateY(-50%)";
        }}
      >
        <span className="text-xl">💬</span>
        <span className="[writing-mode:vertical-rl] [text-orientation:upright] font-bold text-sm tracking-wider">
          ИИ
        </span>
      </button>

      {open && (
        <div className="fixed top-1/2 right-6 -translate-y-1/2 w-[min(420px,calc(100vw-48px))] max-h-[min(80vh,600px)] bg-white rounded-xl shadow-xl z-[9999] flex flex-col overflow-visible">
          {/* Крестик закрытия — сверху справа */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Закрыть"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#FFD600] flex items-center justify-center text-xl font-bold text-[#333] shadow-md hover:bg-gray-200 hover:text-black transition-colors z-[10000]"
          >
            ×
          </button>
          <div className="p-3 border-b border-[#eee] shrink-0">
            <div className="mb-2">
              <div className="font-semibold">ИИ-чат</div>
            </div>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setContextMode(CONTEXT_GENERAL)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  contextMode === CONTEXT_GENERAL
                    ? "border-2 border-[#FFD600] bg-[#fffde7]"
                    : "border border-[#ddd] bg-white"
                }`}
              >
                Общий ИИ
              </button>
              <button
                type="button"
                onClick={() => setContextMode(CONTEXT_CALLS)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  contextMode === CONTEXT_CALLS
                    ? "border-2 border-[#FFD600] bg-[#fffde7]"
                    : "border border-[#ddd] bg-white"
                }`}
              >
                База звонков
              </button>
            </div>
            {contextMode === CONTEXT_CALLS && (
              <div className="flex gap-2 items-center flex-wrap">
                <label className="text-xs">
                  С:
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="ml-1 p-1 rounded border border-[#ddd]"
                  />
                </label>
                <label className="text-xs">
                  По:
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="ml-1 p-1 rounded border border-[#ddd]"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-3 min-h-[120px]">
            {messages.length === 0 && (
              <div className="text-[#888] text-sm text-center py-6">
                {contextMode === CONTEXT_GENERAL
                  ? "Задайте любой вопрос."
                  : "Задайте вопрос по расшифровкам звонков за выбранный период."}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`mb-2.5 p-2.5 rounded-lg whitespace-pre-wrap break-words text-sm ${
                  m.role === "user"
                    ? "bg-[#f0f0f0] ml-6 mr-0"
                    : "bg-[#f9f9f9] ml-0 mr-6"
                }`}
              >
                {m.role === "user" ? "Вы" : "ИИ"}: {m.content}
              </div>
            ))}
            {loading && <div className="text-[#888] text-sm p-2">Ответ...</div>}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="p-2 bg-[#ffebee] text-[#c62828] text-xs">
              {error}
            </div>
          )}

          <div className="p-3 border-t border-[#eee] shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Введите сообщение..."
                rows={2}
                disabled={loading}
                className="flex-1 p-2.5 rounded-lg border border-[#ddd] resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !inputValue.trim()}
                className="px-4 py-2.5 rounded-lg bg-[#FFD600] font-medium self-end disabled:opacity-70 disabled:cursor-not-allowed hover:bg-[#E6C200] transition-colors"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
