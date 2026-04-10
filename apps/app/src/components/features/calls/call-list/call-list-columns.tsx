"use client";

import { DataGridColumnHeader } from "@calls/ui";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  createLinkOrButton,
  renderCallTopicCell,
  renderCallTypeCell,
  renderDateCell,
  renderDirectionCell,
  renderDurationCell,
  renderManagerNameCell,
  renderNumberCell,
  renderScoreCell,
  renderSentimentCell,
  renderStatusCell,
  renderSummaryCell,
} from "./call-list-cell-renderers";
import { RecordColumnCell } from "./call-list-record-cell";
import type { CallWithDetails } from "./types";

export interface CallListColumnsOptions {
  onSelectCall: (callId: string) => void;
  onGenerateRecommendations: (callId: string, existingRecommendations?: string[]) => void;
  onTranscribe?: (callId: string) => void;
  onPlay?: (callId: string, number: string) => void;
  isLoadingRecommendations: boolean;
  recommendationsCallId: string | null;
  isWorkspaceAdmin: boolean;
  router: AppRouterInstance;
}

export function getCallListColumns(options: CallListColumnsOptions): ColumnDef<CallWithDetails>[] {
  const {
    onSelectCall,
    onGenerateRecommendations,
    onTranscribe,
    onPlay,
    isLoadingRecommendations,
    recommendationsCallId,
    isWorkspaceAdmin,
    router,
  } = options;

  const renderLinkOrButton = createLinkOrButton(router, onSelectCall);

  const columnTooltips: Record<string, string> = {
    status: "Статус звонка (принят, пропущен, ошибка и т.д.)",
    score: "Ценность звонка (0 = не оценено, 1-5 = оценка сделки)",
    summary: "Краткое резюме разговора",
    record: "Быстрые действия по звонку: запись, транскрипция, рекомендации",
  };
  const headerClassName = "h-auto min-h-6 py-1 text-left leading-tight whitespace-normal";

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
          className={headerClassName}
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
        <DataGridColumnHeader
          column={column}
          title="Номер"
          className={headerClassName}
          visibility={true}
        />
      ),
      cell: ({ row }) => renderNumberCell(row.original, renderLinkOrButton),
      meta: { headerTitle: "Номер" },
    },
    {
      accessorKey: "call.direction",
      id: "type",
      minSize: 116,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Направление"
          className={headerClassName}
          visibility={true}
        />
      ),
      cell: ({ row }) => renderDirectionCell(row.original.call),
      meta: { headerTitle: "Направление" },
    },
    {
      accessorKey: "transcript.callType",
      id: "callType",
      size: 164,
      minSize: 140,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Тип звонка"
          className={headerClassName}
          visibility={true}
        />
      ),
      cell: ({ row }) => renderCallTypeCell(row.original.transcript),
      meta: { headerTitle: "Тип звонка" },
    },
    {
      id: "manager",
      accessorFn: (row) => row.call.managerName?.trim() || row.call.operatorName?.trim() || "",
      size: 164,
      minSize: 140,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Менеджер"
          className={headerClassName}
          visibility={true}
        />
      ),
      cell: ({ row }) => renderManagerNameCell(row.original.call),
      meta: { headerTitle: "Менеджер" },
    },
    {
      accessorKey: "transcript.callTopic",
      id: "callTopic",
      size: 180,
      minSize: 150,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Тема звонка"
          className={headerClassName}
          visibility={true}
        />
      ),
      cell: ({ row }) => renderCallTopicCell(row.original.transcript),
      meta: { headerTitle: "Тема звонка" },
    },
    {
      accessorKey: "transcript.sentiment",
      id: "sentiment",
      size: 136,
      minSize: 120,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Тональность"
          className={headerClassName}
          visibility={true}
        />
      ),
      cell: ({ row }) => renderSentimentCell(row.original.transcript),
      meta: { headerTitle: "Тональность" },
    },
    {
      accessorKey: "call.duration",
      id: "status",
      minSize: 120,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Статус"
          className={headerClassName}
          tooltip={columnTooltips.status}
          visibility={true}
        />
      ),
      cell: ({ row }) => renderStatusCell(row.original.call),
      meta: { headerTitle: "Статус" },
      enableSorting: false,
    },
    {
      accessorKey: "call.duration",
      id: "duration",
      minSize: 96,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Длительность"
          className={headerClassName}
          visibility={true}
        />
      ),
      cell: ({ row }) => renderDurationCell(row.original.call),
      meta: { headerTitle: "Длительность" },
    },
    {
      accessorKey: "evaluation.valueScore",
      id: "score",
      minSize: 108,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Ценность"
          className={headerClassName}
          tooltip={columnTooltips.score}
          visibility={true}
        />
      ),
      cell: ({ row }) => renderScoreCell(row.original.evaluation),
      meta: { headerTitle: "Ценность" },
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
          className={headerClassName}
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
      accessorFn: (row) => row.call.fileId ?? "",
      minSize: 116,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Действия"
          className={headerClassName}
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
          isWorkspaceAdmin={isWorkspaceAdmin}
        />
      ),
      meta: { headerTitle: "Действия" },
      enableSorting: false,
    },
  ];
}
