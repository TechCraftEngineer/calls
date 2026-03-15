"use client";

import { Button } from "@calls/ui";
import type { CallDetail } from "./types";

interface DeleteConfirmModalProps {
  call: CallDetail | null;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  call,
  deleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <div
      className="modal-overlay z-3000"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="modal-container max-w-[480px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-bold text-[#111]">
          Подтверждение удаления
        </h3>
        <p className="mb-6 text-sm text-gray-500 leading-relaxed">
          Вы уверены, что хотите удалить этот звонок?
        </p>
        {call && (
          <div className="mb-6 p-3 bg-gray-100 rounded-lg text-[13px] text-gray-600">
            <div>
              <strong>Номер:</strong> {call.number}
            </div>
            <div>
              <strong>Дата:</strong>{" "}
              {new Date(call.timestamp).toLocaleString("ru-RU")}
            </div>
            <div>
              <strong>Длительность:</strong> {Math.round(call.duration_seconds)}
              с
            </div>
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full inline-block animate-spin" />
                Удаление...
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Удалить
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
