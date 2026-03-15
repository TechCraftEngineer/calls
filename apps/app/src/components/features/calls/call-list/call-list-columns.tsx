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

  const columnTooltips: Record<string, string> = {
    type: "Входящий или исходящий звонок",
    number: "Номер телефона абонента",
    manager: "Сотрудник, принявший или совершивший звонок",
    status: "Результат звонка (отвечен, пропущен и т.д.)",
    date: "Дата и время звонка",
    score: "Оценка качества звонка",
    summary: "Краткое резюме разговора",
    record: "Запись разговора и действия",
    duration: "Длительность звонка в минутах и секундах",
  };

  return [
    {
      accessorKey: "call.direction",
      id: "type",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Направление"
          tooltip={columnTooltips.type}
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
        <DataGridColumnHeader
          column={column}
          title="Номер"
          tooltip={columnTooltips.number}
          visibility={true}
        />
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
          tooltip={columnTooltips.manager}
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
          tooltip={columnTooltips.date}
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
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Резюме"
          tooltip={columnTooltips.summary}
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
      accessorKey: "call.duration_seconds",
      id: "duration",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Длительность"
          tooltip={columnTooltips.duration}
          visibility={true}
        />
      ),
      cell: ({ row }) => renderDurationCell(row.original.call),
      meta: { headerTitle: "Длительность" },
    },
  ];
}
