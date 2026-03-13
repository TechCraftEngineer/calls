"use client";

import { Badge, cn } from "@calls/ui";

interface CallDetail {
  number: string;
  timestamp: string;
  duration_seconds: number;
  direction: string;
  manager_name?: string;
  operator_name?: string;
}

interface CallMetaHeaderProps {
  call: CallDetail;
}

export default function CallMetaHeader({ call }: CallMetaHeaderProps) {
  const isCompleted = call.duration_seconds > 0;

  return (
    <div className="call-meta-header">
      <div className="call-title-row">
        <span className="call-main-number">{call.number}</span>
        <Badge
          variant="secondary"
          className="bg-[#F5F5F7] text-[#888] border-0 font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded"
        >
          {call.direction === "incoming" ? "ВХОДЯЩИЙ" : "ИСХОДЯЩИЙ"}
        </Badge>
        <Badge
          variant={isCompleted ? "default" : "destructive"}
          className={cn(
            "font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded",
            isCompleted && "status-success",
          )}
        >
          {isCompleted ? "ЗАВЕРШЁН" : "ПРОПУЩЕН"}
        </Badge>
      </div>
      <div className="call-sub-meta">
        <div className="meta-item-inline">
          📅 {new Date(call.timestamp).toLocaleDateString()}
        </div>
        <div className="meta-item-inline">
          ⏰{" "}
          {new Date(call.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div className="meta-item-inline">
          ⏱️ {Math.round(call.duration_seconds)}с
        </div>
        <div className="meta-item-inline">
          👤 {call.manager_name || call.operator_name || "—"}
        </div>
      </div>
    </div>
  );
}
