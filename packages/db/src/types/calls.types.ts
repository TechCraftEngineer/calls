/**
 * Types related to calls operations
 */

export interface GetCallsParams {
  workspaceId?: number;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
  internalNumbers?: string[];
  mobileNumbers?: string[];
  direction?: string;
  valueScores?: number[];
  operators?: string[];
  manager?: string;
  status?: string;
  q?: string;
}

export interface CallWithTranscript {
  call: any;
  transcript: any;
  evaluation: any;
}

export interface CreateCallData {
  workspaceId: number;
  filename: string;
  number?: string | null;
  timestamp: string;
  name?: string | null;
  duration?: number | null;
  direction?: string | null;
  status?: string | null;
  size_bytes?: number | null;
  internal_number?: string | null;
  source?: string | null;
  customer_name?: string | null;
}

export interface EvaluationData {
  call_id: number;
  value_score?: number | null;
  value_explanation?: string | null;
  manager_score?: number | null;
  manager_feedback?: string | null;
  manager_breakdown?: Record<string, unknown> | string | null;
  manager_recommendations?: string[] | null;
  is_quality_analyzable?: boolean;
  not_analyzable_reason?: string | null;
}
