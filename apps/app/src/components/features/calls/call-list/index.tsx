"use client";

import { Table, TableBody, TableHead, TableHeader, TableRow } from "@calls/ui";
import CallDetailModal from "../call-detail-modal";
import RecommendationsModal from "../recommendations-modal";
import { getRowBackground, renderCallListCell } from "./call-list-cells";
import { CallListColumnToggle } from "./call-list-column-toggle";
import { CallListEmpty } from "./call-list-empty";
import type { CallListProps } from "./types";
import { useCallListState } from "./use-call-list-state";

export default function CallList(props: CallListProps) {
  const state = useCallListState(props);

  if (state.calls.length === 0) {
    return <CallListEmpty />;
  }

  return (
    <div className="relative">
      <CallListColumnToggle
        orderedColumns={state.orderedColumns}
        visibleColumns={state.visibleColumns}
        showColumnToggle={state.showColumnToggle}
        onToggle={() => state.setShowColumnToggle(!state.showColumnToggle)}
        onToggleColumn={state.toggleColumn}
        onResetOrder={state.handleResetOrder}
      />

      <Table className="op-table">
        <TableHeader>
          <TableRow className="border-none">
            {state.orderedColumns.map(
              (col) =>
                state.visibleColumns.includes(col.key) && (
                  <TableHead
                    key={col.key}
                    draggable
                    onDragStart={(e) => state.handleDragStart(e, col.key)}
                    onDragEnd={state.handleDragEnd}
                    onDragOver={(e) => state.handleDragOver(e, col.key)}
                    onDragLeave={() => state.setDragOverColumn(null)}
                    onDrop={(e) => state.handleDrop(e, col.key)}
                    className="select-none relative transition-colors duration-200"
                    style={{
                      cursor: "move",
                      backgroundColor:
                        state.dragOverColumn === col.key
                          ? "#f0f8ff"
                          : state.draggedColumn === col.key
                            ? "#f5f5f5"
                            : "transparent",
                      opacity: state.draggedColumn === col.key ? 0.5 : 1,
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className="cursor-move text-gray-400 text-xs mr-0.5 inline-flex items-center"
                        title="Перетащите для изменения порядка"
                        onMouseDown={(e) => e.stopPropagation()}
                        aria-hidden
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          {[2, 6, 10].flatMap((x) =>
                            [2, 6, 10].map((y) => (
                              <circle key={`${x}-${y}`} cx={x} cy={y} r={1} fill="currentColor" />
                            )),
                          )}
                        </svg>
                      </span>
                      {col.label}
                      <div className="op-tooltip inline-flex">
                        <span className="info-icon m-0">i</span>
                        <div className="tooltip-content font-normal normal-case tracking-normal">
                          {col.tooltip}
                        </div>
                      </div>
                    </div>
                  </TableHead>
                ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {state.sortedCalls.map((item) => {
            const { call } = item;
            const dateKey = call.timestamp
              ? new Date(call.timestamp).toISOString().slice(0, 10)
              : "";
            const rowBg = getRowBackground(dateKey);

            return (
              <TableRow key={call.id} style={{ backgroundColor: rowBg }}>
                {state.columnOrder.map((colKey) =>
                  renderCallListCell({
                    item,
                    colKey,
                    visibleColumns: state.visibleColumns,
                    onSelectCall: state.setSelectedCallId,
                    onGenerateRecommendations: state.handleGenerateRecommendations,
                    onTranscribe: state.handleTranscribe,
                    onPlay: state.onPlay,
                    isLoadingRecommendations: state.isLoadingRecommendations,
                    recommendationsCallId: state.recommendationsCallId,
                  }),
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {state.selectedCallId && (
        <CallDetailModal
          callId={state.selectedCallId}
          onClose={() => state.setSelectedCallId(null)}
          onCallDeleted={state.handleCallDeleted}
        />
      )}

      <RecommendationsModal
        isOpen={state.recommendationsCallId !== null}
        onClose={state.handleCloseRecommendations}
        recommendations={state.recommendations}
        isLoading={state.isLoadingRecommendations}
      />
    </div>
  );
}
