"use client";

import { useEffect, useRef } from "react";

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

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Блокировка скролла body при открытом модальном окне
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

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "20px",
      }}
    >
      <div
        className="modal-container"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "12px",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
          position: "relative",
        }}
      >
        <div style={{ padding: "24px" }}>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "none",
              border: "none",
              fontSize: "28px",
              cursor: "pointer",
              color: "#999",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              transition: "all 0.2s",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f5f5f5";
              e.currentTarget.style.color = "#333";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.color = "#999";
            }}
          >
            ×
          </button>

          <div style={{ paddingRight: "40px" }}>
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "20px",
                fontWeight: 700,
                color: "#111",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "24px" }}>💡</span> РЕКОМЕНДАЦИИ
            </h3>

            {isLoading ? (
              <div
                style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    border: "4px solid #f0f0f0",
                    borderTop: "4px solid #F7931E",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                ></div>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  Формирование рекомендаций...
                </div>
              </div>
            ) : recommendations.length > 0 ? (
              <>
                <p
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "13px",
                    color: "#856404",
                    fontStyle: "italic",
                  }}
                >
                  Вопросы, которые можно было задать (с учётом истории):
                </p>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                  }}
                >
                  {recommendations.map((rec, i) => (
                    <li
                      key={i}
                      style={{
                        marginBottom: "12px",
                        fontSize: "14px",
                        lineHeight: "1.6",
                        position: "relative",
                        paddingLeft: "20px",
                        color: "#533F03",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          color: "#F7931E",
                          fontSize: "18px",
                        }}
                      >
                        •
                      </span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#999",
                  fontSize: "14px",
                }}
              >
                Рекомендации не найдены
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
