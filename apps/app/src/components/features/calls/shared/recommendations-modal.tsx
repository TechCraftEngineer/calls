"use client";

import { Button } from "@calls/ui";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface RecommendationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: string[];
  isLoading: boolean;
}

export default function RecommendationsModal({
  isOpen,
  onClose,
  recommendations,
  isLoading,
}: RecommendationsModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div
        className="modal-container max-w-[600px] max-h-[80vh]"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute top-4 right-4 z-10"
          >
            ×
          </Button>

          <div className="pr-10">
            <h3 className="mb-5 text-xl font-bold text-[#111] flex items-center gap-2">
              <span className="text-2xl">💡</span> РЕКОМЕНДАЦИИ
            </h3>

            {isLoading ? (
              <div className="py-[60px] px-5 text-center flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-gray-100 border-t-[#F7931E] rounded-full animate-spin" />
                <div className="text-sm text-gray-500">Формирование рекомендаций…</div>
              </div>
            ) : recommendations.length > 0 ? (
              <>
                <p className="mb-4 text-[13px] text-amber-800 italic">
                  Вопросы, которые можно было задать (с учётом истории):
                </p>
                <ul className="m-0 p-0 list-none">
                  {recommendations.map((rec, i) => (
                    <li
                      key={i}
                      className="mb-3 text-sm leading-relaxed relative pl-5 text-[#533F03]"
                    >
                      <span className="absolute left-0 text-[#F7931E] text-lg">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="py-10 px-5 text-center text-gray-400 text-sm">
                Рекомендации не найдены
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
