"use client";

import { DataGridColumnHeader } from "@calls/ui";
import type { ColumnDef } from "@tanstack/react-table";
import {
  createLinkOrButton,
  renderAnalysisCostCell,
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
  onSelectCall: (callId: string) => void;
  onGenerateRecommendations: (
    callId: string,
    existingRecommendations?: string[],
  ) => void;
  onTranscribe?: (callId: string) => void;
  onPlay?: (filename: string, number: string) => void;
  isLoadingRecommendations: boolean;
  recommendationsCallId: string | null;
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

  const columnTooltips: Record<string, string> = {
    status: "Результат звонка (отвечен, пропущен и т.д.)",
    score: "Оценка качества звонка",
    summary: "Краткое резюме разговора",
    record: "Запись разговора и действия",
  };

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
      accessorKey: "call.managerName",
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
      accessorKey: "call.duration",
      id: "status",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Результат"
          tooltip={columnTooltips.status}
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
      accessorKey: "evaluation.valueScore",
      id: "score",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Оценка"
          tooltip={columnTooltips.score}
          visibility={true}
        />
      ),
      cell: ({ row }) => renderScoreCell(row.original.evaluation),
      meta: { headerTitle: "Оценка" },
    },
    {
      accessorKey: "transcript.summary",
      id: "summary",
      size: 220,
      maxSize: 220,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Резюме"
          tooltip={columnTooltips.summary}
          visibility={true}
        />
      ),
      cell: ({ row }) => renderSummaryCell(row.original.transcript),
      meta: {
        headerTitle: "Резюме",
        cellClassName: "max-w-[220px] overflow-hidden",
      },
    },
    {
      accessorKey: "analysisCostRub",
      id: "analysisCost",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Стоимость анализа"
          visibility={true}
        />
      ),
      cell: ({ row }) => renderAnalysisCostCell(row.original.analysisCostRub),
      meta: { headerTitle: "Стоимость анализа" },
    },
    {
      id: "record",
      accessorFn: (row) => row.call.filename ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Запись"
          tooltip={columnTooltips.record}
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
      accessorKey: "call.duration",
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
