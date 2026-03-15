import { usersService } from "@calls/db";
import { isAdminUser } from "../../user-profile";

export async function canAccessUser(
  currentUserId: string,
  targetUserId: string,
): Promise<boolean> {
  if (currentUserId === targetUserId) return true;
  const user = await usersService.getUser(currentUserId);
  if (!user) return false;
  return isAdminUser(user as Record<string, unknown>);
}
