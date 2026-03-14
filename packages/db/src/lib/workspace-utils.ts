/**
 * Workspace utilities for consistent error handling and lookup patterns
 */

import type { WorkspacesService } from "../services/workspaces.service";
import { workspaceCache } from "./workspace-cache";

export async function getDefaultWorkspace(
  workspacesService: WorkspacesService,
) {
  try {
    const cacheKey = workspaceCache.createDefaultWorkspaceKey();
    const cached =
      workspaceCache.get<
        Awaited<ReturnType<typeof workspacesService.getBySlug>>
      >(cacheKey);
    if (cached) return cached;

    const defaultWs = await workspacesService.getBySlug("default");
    if (defaultWs) {
      workspaceCache.set(cacheKey, defaultWs);
    }
    return defaultWs;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get default workspace: ${errorMessage}`);
  }
}

export function createWorkspaceErrorResponse(reason: string) {
  return {
    skipped: true,
    reason,
  };
}

export function createWorkspaceNullResponse() {
  return null;
}

export function handleWorkspaceError(
  error: unknown,
  context: string,
): { error: string; skipped?: boolean } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    error: `${context}: ${errorMessage}`,
  };
}
