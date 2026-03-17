import { systemRepository, usersService } from "@calls/db";
import type { WorkspaceRole } from "../../orpc";
import { isAdminUser } from "../../user-profile";

export async function logUpdate(
  action: string,
  username: string,
  contextUsername: string,
  error?: unknown,
  workspaceId?: string | null,
) {
  await systemRepository.addActivityLog(
    error ? "error" : "info",
    error
      ? `Failed to ${action} ${username}: ${error instanceof Error ? error.message : String(error)}`
      : `User ${action}: ${username}`,
    contextUsername,
    workspaceId,
  );
}

export async function canAccessUser(
  currentUserId: string,
  targetUserId: string,
  workspaceRole: WorkspaceRole | null,
): Promise<boolean> {
  if (currentUserId === targetUserId) return true;

  // Check workspace role first (fast path)
  if (workspaceRole === "admin" || workspaceRole === "owner") {
    return true;
  }

  // Fallback to database check for additional security
  try {
    const user = await usersService.getUser(currentUserId);
    if (!user) return false;
    return isAdminUser(user as Record<string, unknown>);
  } catch {
    return false;
  }
}
