"use client";

import { Button } from "@calls/ui";
import type { ColumnConfig } from "./types";

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

interface CallListColumnToggleProps {
  orderedColumns: ColumnConfig[];
  visibleColumns: string[];
  showColumnToggle: boolean;
  onToggle: () => void;
  onToggleColumn: (key: string) => void;
  onResetOrder: () => void;
}

export function CallListColumnToggle({
  orderedColumns,
  visibleColumns,
  showColumnToggle,
  onToggle,
  onToggleColumn,
  onResetOrder,
}: CallListColumnToggleProps) {
  return (
    <div className="absolute right-4 -top-[45px] z-10">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="text-gray-400 hover:text-gray-800"
        title="Настройка колонок"
        aria-label="Настройка колонок"
      >
        <SettingsIcon />
      </Button>

      {showColumnToggle && (
        <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg p-3 shadow-lg w-[200px] z-100">
          <div className="text-xs font-bold mb-2 text-gray-400 uppercase">Видимость колонок</div>
          {orderedColumns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 py-1 cursor-pointer text-[13px]"
            >
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.key)}
                onChange={() => onToggleColumn(col.key)}
              />
              {col.label}
            </label>
          ))}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <Button variant="outline" size="sm" onClick={onResetOrder} className="w-full text-xs">
              Сбросить порядок колонок
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
