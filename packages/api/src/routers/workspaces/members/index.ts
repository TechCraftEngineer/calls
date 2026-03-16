import { addMember } from "./add-member";
import { listMembers } from "./list-members";
import { listUsersAvailableToAdd } from "./list-users-available-to-add";
import { removeMember } from "./remove-member";
import { updateMemberRole } from "./update-member-role";

export const membersRouter = {
  listMembers,
  addMember,
  removeMember,
  updateMemberRole,
  listUsersAvailableToAdd,
};
