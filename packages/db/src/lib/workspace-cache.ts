/**
 * Simple workspace cache to avoid repeated database queries
 */

interface CacheEntry<T = unknown> {
  value: T;
  timestamp: number;
  ttl: number;
}

class WorkspaceCache {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  // Cache key constants to prevent collisions
  private readonly KEY_PREFIXES = {
    DEFAULT_WORKSPACE: "workspace:default",
    BY_SLUG: "workspace:by_slug:",
    BY_ID: "workspace:by_id:",
    ACTIVE_WORKSPACE: "workspace:active:",
    USER_WORKSPACES: "workspace:user:",
  } as const;

  set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cache invalidation for workspace-related operations
  invalidateWorkspace(workspaceId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(
      (key) =>
        key === this.KEY_PREFIXES.BY_ID + workspaceId ||
        key.startsWith(this.KEY_PREFIXES.BY_SLUG + workspaceId) ||
        key === this.KEY_PREFIXES.DEFAULT_WORKSPACE,
    );
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  // Helper methods for creating cache keys
  createDefaultWorkspaceKey(): string {
    return this.KEY_PREFIXES.DEFAULT_WORKSPACE;
  }

  createBySlugKey(slug: string): string {
    return this.KEY_PREFIXES.BY_SLUG + slug;
  }

  createByIdKey(workspaceId: string): string {
    return this.KEY_PREFIXES.BY_ID + workspaceId;
  }

  createActiveWorkspaceKey(userId: string): string {
    return this.KEY_PREFIXES.ACTIVE_WORKSPACE + userId;
  }

  createUserWorkspacesKey(userId: string): string {
    return this.KEY_PREFIXES.USER_WORKSPACES + userId;
  }

  invalidateUserWorkspaces(userId: string): void {
    const activeKey = this.createActiveWorkspaceKey(userId);
    const userWorkspacesKey = this.createUserWorkspacesKey(userId);
    this.cache.delete(activeKey);
    this.cache.delete(userWorkspacesKey);
  }
}

export const workspaceCache = new WorkspaceCache();
