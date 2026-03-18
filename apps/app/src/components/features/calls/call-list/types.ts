export interface Call {
  id: string;
  number?: string;
  timestamp: string;
  direction?: string;
  internalNumber?: string;
  managerName?: string | null;
  operatorName?: string | null;
  managerId?: string | null;
  duration?: number | null;
  filename?: string;
  customerName?: string;
}

export interface Transcript {
  id: string;
  summary?: string;
  callType?: string;
  callTopic?: string;
  sentiment?: string;
}

export interface Evaluation {
  id?: string;
  valueScore?: number;
  valueExplanation?: string;
  managerRecommendations?: string[];
}

export interface CallWithDetails {
  call: Call;
  transcript?: Transcript;
  evaluation?: Evaluation;
  analysisCostRub?: number | null;
}

export interface CallListProps {
  calls: CallWithDetails[];
  onPlay?: (callId: string, number: string) => void;
  onCallDeleted?: (callId: string) => void;
  onCallsDeleted?: (callIds: string[]) => void;
  onRecommendationsGenerated?: (
    callId: string,
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
  | "analysisCost"
  | "duration";

export type SortOrder = "asc" | "desc";

export interface ColumnConfig {
  key: string;
  label: string;
  tooltip: string;
  sortKey?: SortKey;
}
