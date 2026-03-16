/**
 * Типы для API на основе oRPC.
 * Для вызовов API используйте useORPC() в клиентских компонентах с queryOptions/mutationOptions.
 *
 * @example
 * const orpc = useORPC();
 * const { data } = useQuery(orpc.calls.list.queryOptions(params));
 * const mutation = useMutation(orpc.calls.delete.mutationOptions({ ... }));
 */

// Типы для API
export interface Call {
  id: number;
  filename?: string;
  number?: string;
  timestamp: string;
  name?: string;
  duration?: number;
  direction?: string;
  status?: string;
  size_bytes?: number;
  internal_number?: string;
  source?: string;
  customer_name?: string;
}

export interface Transcript {
  id: number;
  call_id: number;
  text?: string;
  raw_text?: string;
  title?: string;
  sentiment?: string;
  confidence?: number;
  summary?: string;
  size_kb?: number;
  caller_name?: string;
  call_type?: string;
  call_topic?: string;
}

export interface CallEvaluation {
  id: number;
  call_id: number;
  value_score?: number;
  value_explanation?: string;
  manager_score?: number;
  manager_feedback?: string;
  manager_recommendations?: string[];
  is_quality_analyzable?: boolean;
  not_analyzable_reason?: string;
  created_at: string;
}

export interface User {
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
