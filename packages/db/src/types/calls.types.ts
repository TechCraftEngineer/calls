/**
 * Types related to calls operations
 */

import type { Call, CallEvaluation, Transcript } from "../schema/types";

export const CALL_DIRECTIONS = {
  INBOUND: "inbound",
  OUTBOUND: "outbound",
  INCOMING: "incoming",
  OUTGOING: "outgoing",
} as const;

export type CallDirection =
  (typeof CALL_DIRECTIONS)[keyof typeof CALL_DIRECTIONS];

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
  direction?: string;
  valueScores?: number[];
  operators?: string[];
  manager?: string;
  status?: string;
  q?: string;
}

export interface GetCallManagersParams
  extends Omit<GetCallsParams, "limit" | "offset" | "manager" | "q"> {}

export interface CallWithTranscript {
  call: Call;
  transcript: Transcript | null;
  evaluation: CallEvaluation | null;
}

export interface CreateCallData {
  workspaceId: string;
  filename: string;
  number?: string | null;
  timestamp: string;
  name?: string | null;
  duration?: number | null;
  direction?: string | null;
  status?: string | null;
  sizeBytes?: number | null;
  fileId?: string | null;
  pbxNumberId?: string | null;
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
