export interface Call {
  id: number;
  number?: string;
  timestamp: string;
  direction?: string;
  internal_number?: string;
  manager_name?: string;
  operator_name?: string;
  duration?: number | null;
  filename?: string;
  customer_name?: string;
}

export interface Transcript {
  id: number;
  summary?: string;
  call_type?: string;
  call_topic?: string;
  sentiment?: string;
}

export interface Evaluation {
  id?: number;
  value_score?: number;
  value_explanation?: string;
  manager_recommendations?: string[];
}

export interface CallWithDetails {
  call: Call;
  transcript?: Transcript;
  evaluation?: Evaluation;
}

export interface CallListProps {
  calls: CallWithDetails[];
  onPlay?: (callId: string, number: string) => void;
  onCallDeleted?: (callId: number) => void;
  onRecommendationsGenerated?: (
    callId: number,
    recommendations: string[],
  ) => void;
}

export type SortKey =
  | "type"
  | "number"
  | "manager"
  | "status"
  | "date"
  | "score"
  | "summary"
  | "duration";

export type SortOrder = "asc" | "desc";

export interface ColumnConfig {
  key: string;
  label: string;
  tooltip: string;
  sortKey?: SortKey;
}
