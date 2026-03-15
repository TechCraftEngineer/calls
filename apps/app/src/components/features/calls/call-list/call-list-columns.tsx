"use client";

import { DataGridColumnHeader } from "@calls/ui";
import type { ColumnDef } from "@tanstack/react-table";
import {
  createLinkOrButton,
  renderDateCell,
  renderDirectionCell,
  renderDurationCell,
  renderManagerCell,
  renderNumberCell,
  renderScoreCell,
  renderStatusCell,
  renderSummaryCell,
} from "./call-list-cell-renderers";
import { RecordColumnCell } from "./call-list-record-cell";
import type { CallWithDetails } from "./types";

export interface CallListColumnsOptions {
  onSelectCall: (callId: number) => void;
  onGenerateRecommendations: (
    callId: number,
    existingRecommendations?: string[],
  ) => void;
  onTranscribe?: (callId: number) => void;
  onPlay?: (filename: string, number: string) => void;
  isLoadingRecommendations: boolean;
  recommendationsCallId: number | null;
}

export function getCallListColumns(
  options: CallListColumnsOptions,
): ColumnDef<CallWithDetails>[] {
  const {
    onSelectCall,
    onGenerateRecommendations,
    onTranscribe,
    onPlay,
    isLoadingRecommendations,
    recommendationsCallId,
  } = options;

  const renderLinkOrButton = createLinkOrButton(onSelectCall);

  return [
    {
      accessorKey: "call.direction",
      id: "type",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Направление"
          visibility={true}
        />
      ),
      cell: ({ row }) => renderDirectionCell(row.original.call),
      meta: { headerTitle: "Направление" },
    },
    {
      accessorKey: "call.number",
      id: "number",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Номер" visibility={true} />
      ),
      cell: ({ row }) => renderNumberCell(row.original, renderLinkOrButton),
      meta: { headerTitle: "Номер" },
    },
    {
      accessorKey: "call.manager_name",
      id: "manager",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Сотрудник"
          visibility={true}
        />
      ),
      cell: ({ row }) => renderManagerCell(row.original.call),
      meta: { headerTitle: "Сотрудник" },
    },
    {
      accessorKey: "call.duration_seconds",
      id: "status",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Результат"
          visibility={true}
        />
      ),
      cell: ({ row }) => renderStatusCell(row.original.call),
      meta: { headerTitle: "Результат" },
    },
    {
      accessorKey: "call.timestamp",
      id: "date",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Дата и время"
          visibility={true}
        />
      ),
      cell: ({ row }) => renderDateCell(row.original.call),
      meta: { headerTitle: "Дата и время" },
    },
    {
      accessorKey: "evaluation.value_score",
      id: "score",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Оценка"
          visibility={true}
        />
      ),
      cell: ({ row }) => renderScoreCell(row.original.evaluation),
      meta: { headerTitle: "Оценка" },
    },
    {
      accessorKey: "transcript.summary",
      id: "summary",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Резюме"
          visibility={true}
        />
      ),
      cell: ({ row }) => renderSummaryCell(row.original.transcript),
      meta: { headerTitle: "Резюме" },
    },
    {
      id: "record",
      accessorFn: (row) => row.call.filename ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Запись"
          visibility={true}
        />
      ),
      cell: ({ row }) => (
        <RecordColumnCell
          item={row.original}
          onGenerateRecommendations={onGenerateRecommendations}
          onTranscribe={onTranscribe}
          onPlay={onPlay}
          isLoadingRecommendations={isLoadingRecommendations}
          recommendationsCallId={recommendationsCallId}
        />
      ),
      meta: { headerTitle: "Запись" },
      enableSorting: false,
    },
    {
      accessorKey: "call.duration_seconds",
      id: "duration",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Длительность"
          visibility={true}
        />
      ),
      cell: ({ row }) => renderDurationCell(row.original.call),
      meta: { headerTitle: "Длительность" },
    },
  ];
}
