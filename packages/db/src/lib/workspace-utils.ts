/**
 * Workspace utilities for consistent error handling and lookup patterns
 */

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
