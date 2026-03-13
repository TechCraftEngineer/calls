export interface CallDetail {
  id: number;
  number: string;
  timestamp: string;
  duration_seconds: number;
  direction: string;
  internal_number?: string;
  manager_name?: string;
  operator_name?: string;
  filename?: string;
  size_bytes?: number;
  customer_name?: string;
}

export interface TranscriptDetail {
  id: number;
  text: string;
  raw_text?: string;
  summary: string;
  call_type: string;
  call_topic: string;
  sentiment: string;
}

export interface EvaluationDetail {
  id: number;
  value_score: number;
  value_explanation: string;
  manager_score?: number | null;
  manager_feedback?: string | null;
  is_quality_analyzable?: boolean | null;
  not_analyzable_reason?: string | null;
  manager_recommendations?: string[];
}
