/**
 * Типы для API на основе oRPC.
 * Для вызовов API используйте useORPC() в клиентских компонентах с queryOptions/mutationOptions.
 *
 * @example
 * const orpc = useORPC();
 * const { data } = useQuery(orpc.calls.list.queryOptions(params));
 * const mutation = useMutation(orpc.calls.delete.mutationOptions({ ... }));
 */

// Типы для API (camelCase — соответствует Drizzle/БД)
export interface Call {
  id: string;
  fileId?: string | null;
  number?: string;
  timestamp: string;
  name?: string;
  duration?: number;
  direction?: string;
  status?: string;
  sizeBytes?: number;
  internalNumber?: string;
  source?: string;
  customerName?: string;
  managerName?: string | null;
  operatorName?: string | null;
  managerId?: string | null;
}

export interface Transcript {
  id: string;
  callId: string;
  text?: string;
  rawText?: string;
  title?: string;
  sentiment?: string;
  confidence?: number;
  summary?: string;
  sizeKb?: number;
  callerName?: string;
  callType?: string;
  callTopic?: string;
}

export interface CallEvaluation {
  id: string;
  callId: string;
  valueScore?: number;
  valueExplanation?: string;
  managerScore?: number;
  managerFeedback?: string;
  managerRecommendations?: string[] | null;
  isQualityAnalyzable?: boolean;
  notAnalyzableReason?: string;
  createdAt: string;
}

export interface ApiUser {
  id: number;
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
  internalExtensions?: string;
  mobilePhones?: string;
  created_at: string;
  is_active: boolean;
  telegramChatId?: string;
}

export interface CallsResponse {
  calls: (Call & {
    transcript?: Transcript;
    evaluation?: CallEvaluation;
  })[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  metrics: {
    total_calls: number;
    transcribed: number;
    avg_duration: number;
  };
  managers: string[];
}

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberSince?: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string; email: string | null };
}

export interface UserAvailableToAdd {
  id: string;
  name: string;
  email: string;
}
