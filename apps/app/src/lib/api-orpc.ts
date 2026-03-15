/**
 * API слой на основе oRPC.
 * Заменяет axios запросы на типизированный oRPC client.
 */

import { api } from "./orpc";

// Типы для API (будут уточняться по мере использования)
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
  username: string;
  name: string;
  givenName?: string;
  familyName?: string;
  internalExtensions?: string;
  mobilePhones?: string;
  created_at: string;
  is_active: boolean;
  telegramChatId?: string;
  email?: string;
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

// Calls API
export const callsApi = {
  async list(
    params: {
      page?: number;
      per_page?: number;
      date_from?: string;
      date_to?: string;
      direction?: string;
      value?: number[];
      operator?: string[];
      q?: string;
      status?: string;
      manager?: string;
    } = {},
  ): Promise<CallsResponse> {
    return await api.calls.list(params);
  },

  async get(callId: number): Promise<{
    call: Call;
    transcript?: Transcript;
    evaluation?: CallEvaluation;
  }> {
    return await api.calls.get({ call_id: callId });
  },

  async delete(callId: number): Promise<{ success: boolean; message: string }> {
    return await api.calls.delete({ call_id: callId });
  },

  async generateRecommendations(callId: number): Promise<any> {
    return await api.calls.generateRecommendations({ call_id: callId });
  },
};

// Users API
export const usersApi = {
  async list(): Promise<User[]> {
    return await api.users.list();
  },

  async get(userId: string | number): Promise<User> {
    return await api.users.get({ user_id: String(userId) });
  },

  async create(data: {
    username: string;
    password: string;
    givenName: string;
    familyName?: string;
    internalExtensions?: string;
    mobilePhones?: string;
  }): Promise<User> {
    return await api.users.create(data);
  },

  async update(userId: string | number, data: Partial<User>): Promise<User> {
    return await api.users.update({ user_id: String(userId), data });
  },

  async delete(
    userId: string | number,
  ): Promise<{ success: boolean; message: string }> {
    return await api.users.delete({ user_id: String(userId) });
  },

  async telegramAuthUrl(userId: string | number): Promise<{ url?: string }> {
    return await api.users.telegramAuthUrl({ user_id: String(userId) });
  },

  async disconnectTelegram(userId: string | number): Promise<void> {
    return await api.users.disconnectTelegram({ user_id: String(userId) });
  },

  async maxAuthUrl(userId: string | number): Promise<{
    url?: string;
    manual_instruction?: string;
    token?: string;
  }> {
    return await api.users.maxAuthUrl({ user_id: String(userId) });
  },

  async disconnectMax(userId: string | number): Promise<void> {
    return await api.users.disconnectMax({ user_id: String(userId) });
  },
};

// Settings API
export const settingsApi = {
  async getPrompts(): Promise<
    Array<{
      key: string;
      value: string;
      description?: string;
      updated_at?: string;
    }>
  > {
    return await api.settings.getPrompts();
  },

  async updatePrompts(
    prompts: Record<
      string,
      {
        value?: string;
        description?: string;
      }
    >,
  ): Promise<{ success: boolean; message: string }> {
    return await api.settings.updatePrompts({ prompts });
  },

  async getModels(): Promise<{
    models: Record<string, any>;
    current_model: string;
  }> {
    return await api.settings.getModels();
  },

  async backup(): Promise<{ success: boolean; path?: string }> {
    return await api.settings.backup();
  },
};

// Statistics API
export const statisticsApi = {
  async getStatistics(params?: {
    date_from?: string;
    date_to?: string;
    sort?: string;
    order?: string;
  }): Promise<{
    statistics: any[];
    date_from: string;
    date_to: string;
  }> {
    return await api.statistics.getStatistics(params);
  },

  async getMetrics(): Promise<any> {
    return await api.statistics.getMetrics();
  },
};

// Auth API
export const authApi = {
  async checkEmail(email: string): Promise<{ exists: boolean }> {
    return await api.auth.checkEmail({ email });
  },
};

// Workspaces API
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
  user: { id: string; name: string; email: string; username: string | null };
}

export interface UserAvailableToAdd {
  id: string;
  name: string;
  email: string;
  username: string;
}

export const workspacesApi = {
  async list(): Promise<{
    workspaces: WorkspaceItem[];
    activeWorkspaceId: string | null;
  }> {
    return await api.workspaces.list();
  },

  async get(workspaceId: string): Promise<{
    id: string;
    name: string;
    slug: string;
  }> {
    return await api.workspaces.get({ workspaceId });
  },

  async create(data: { name: string; slug: string }): Promise<{
    id: string;
    name: string;
    slug: string;
  }> {
    return await api.workspaces.create(data);
  },

  async update(workspaceId: string, data: { name?: string; slug?: string }) {
    return await api.workspaces.update({ workspaceId, ...data });
  },

  async delete(workspaceId: string): Promise<{ success: boolean }> {
    return await api.workspaces.delete({ workspaceId });
  },

  async setActive(
    workspaceId: string,
  ): Promise<{ success: boolean; workspaceId: string }> {
    return await api.workspaces.setActive({ workspaceId });
  },

  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return await api.workspaces.listMembers({ workspaceId });
  },

  async listUsersAvailableToAdd(
    workspaceId: string,
  ): Promise<UserAvailableToAdd[]> {
    return await api.workspaces.listUsersAvailableToAdd({ workspaceId });
  },

  async addMember(
    workspaceId: string,
    userId: string,
    role: "owner" | "admin" | "member",
  ): Promise<{ success: boolean }> {
    return await api.workspaces.addMember({ workspaceId, userId, role });
  },

  async removeMember(
    workspaceId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    return await api.workspaces.removeMember({ workspaceId, userId });
  },

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: "owner" | "admin" | "member",
  ): Promise<{ success: boolean }> {
    return await api.workspaces.updateMemberRole({ workspaceId, userId, role });
  },
};

// Reports API
export const reportsApi = {
  async sendTestTelegram(): Promise<{ success: boolean }> {
    return await api.reports.sendTestTelegram();
  },
};
