"use client";

import { Badge, cn } from "@calls/ui";
import type { CallDetail } from "@/types/calls";

interface Props {
  call: CallDetail;
}

export default function CallMetaHeader({ call }: Props) {
  const isCompleted = (call.duration ?? 0) > 0;

  return (
    <div className="call-meta-header">
      <div className="call-title-row">
        <span className="call-main-number">{call.number}</span>
        <Badge
          variant="secondary"
          className="bg-[#F5F5F7] text-[#888] border-0 font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded"
        >
          {call.direction === "inbound" ? "ВХОДЯЩИЙ" : "ИСХОДЯЩИЙ"}
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
          ⏱️ {Math.round(call.duration ?? 0)}с
        </div>
        <div className="meta-item-inline">
          👤 {call.managerName || call.operatorName || "—"}
        </div>
      </div>
    </div>
  );
}
