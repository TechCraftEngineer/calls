export interface Call {
  id: string;
  number?: string;
  timestamp: string;
  direction?: string;
  internalNumber?: string;
  fileId?: string | null;
  managerName?: string | null;
  operatorName?: string | null;
  managerId?: string | null;
  duration?: number | null;
  customerName?: string;
  status?: string | null;
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
}

export interface CallListProps {
  calls: CallWithDetails[];
  onPlay?: (callId: string, number: string) => void;
  onCallDeleted?: (callId: string) => void;
  onCallsDeleted?: (callIds: string[]) => void;
  onRecommendationsGenerated?: (callId: string, recommendations: string[]) => void;
}

export interface ColumnConfig {
  key: string;
  label: string;
  tooltip: string;
}
