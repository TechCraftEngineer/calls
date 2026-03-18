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
    record: "Быстрые действия по звонку: запись, транскрипция, рекомендации",
  };

  return [
    {
      accessorKey: "call.timestamp",
      id: "date",
      size: 156,
      minSize: 156,
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
      accessorKey: "call.number",
      id: "number",
      size: 220,
      minSize: 180,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Номер" visibility={true} />
      ),
      cell: ({ row }) => renderNumberCell(row.original, renderLinkOrButton),
      meta: { headerTitle: "Номер" },
    },
    {
      accessorKey: "call.direction",
      id: "type",
      size: 128,
      minSize: 116,
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
      accessorKey: "call.managerName",
      id: "manager",
      size: 168,
      minSize: 140,
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
      size: 132,
      minSize: 120,
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
      accessorKey: "call.duration",
      id: "duration",
      size: 112,
      minSize: 96,
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
    {
      accessorKey: "evaluation.valueScore",
      id: "score",
      size: 120,
      minSize: 108,
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
      minSize: 180,
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
      id: "record",
      accessorFn: (row) => row.call.filename ?? "",
      size: 128,
      minSize: 116,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Действия"
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
      meta: { headerTitle: "Действия" },
      enableSorting: false,
    },
    {
      accessorKey: "analysisCostRub",
      id: "analysisCost",
      size: 144,
      minSize: 132,
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
  ];
}
