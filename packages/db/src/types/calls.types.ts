/**
 * Types related to calls operations
 */

import type { Call, CallEvaluation, Transcript } from "../schema/types";
import type { CallStatus } from "../utils/call-status";

export const CALL_DIRECTIONS = {
  INBOUND: "inbound",
  OUTBOUND: "outbound",
} as const;

export type CallDirection = (typeof CALL_DIRECTIONS)[keyof typeof CALL_DIRECTIONS];

export interface GetCallsParams {
  workspaceId?: string;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
  internalNumbers?: string[];
  mobileNumbers?: string[];
  /** Номера телефонов, исключённые из выборки */
  excludePhoneNumbers?: string[];
  directions?: string[];
  valueScores?: number[];
  /** Internal numbers выбранных менеджеров по их id */
  managerInternalNumbers?: string[];
  statuses?: string[];
  /** Internal numbers найденных сотрудников по текстовому поиску q */
  managerInternalNumbersForQuery?: string[];
  q?: string;
}

export interface GetCallManagersParams
  extends Omit<GetCallsParams, "limit" | "offset" | "manager" | "q"> {}

export interface CallWithTranscript {
  call: Call;
  transcript: Transcript | null;
  evaluation: CallEvaluation | null;
  fileDuration: number | null;
  fileSizeBytes: number | null;
}

export interface CreateCallData {
  workspaceId: string;
  filename: string;
  provider?: string | null;
  externalId?: string | null;
  number?: string | null;
  timestamp: string;
  name?: string | null;
  direction?: string | null;
  status?: CallStatus | string | null;
  fileId?: string | null;
  internalNumber?: string | null;
  source?: string | null;
  customerName?: string | null;
}

export interface EvaluationData {
  callId: string;
  valueScore?: number | null;
  valueExplanation?: string | null;
  managerScore?: number | null;
  managerFeedback?: string | null;
  managerBreakdown?: Record<string, unknown> | string | null;
  managerRecommendations?: string[] | null;
  isQualityAnalyzable?: boolean;
  notAnalyzableReason?: string | null;
}
