export interface CallDetail {
  id: string;
  number: string;
  timestamp: string;
  duration: number;
  direction: string;
  internalNumber?: string;
  fileId?: string | null;
  managerName?: string | null;
  operatorName?: string | null;
  sizeBytes?: number;
  customerName?: string;
}

export interface TranscriptDetail {
  id: string;
  text: string;
  rawText?: string;
  summary: string;
  callType: string;
  callTopic: string;
  sentiment: string;
  speakerMapping?: Record<string, string>;
}

export interface EvaluationDetail {
  id: string;
  valueScore: number;
  valueExplanation: string;
  managerScore?: number | null;
  managerFeedback?: string | null;
  isQualityAnalyzable?: boolean | null;
  notAnalyzableReason?: string | null;
  managerRecommendations?: string[];
}

export interface CallDetailModalProps {
  callId: string;
  onClose: () => void;
  onCallDeleted?: (callId: string) => void;
}
