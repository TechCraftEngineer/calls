import { addMember } from "./add-member";
import { create } from "./create";
import { deleteWorkspace } from "./delete";
import { get } from "./get";
import { list } from "./list";
import { listMembers } from "./list-members";
import { listUsersAvailableToAdd } from "./list-users-available-to-add";
import { removeMember } from "./remove-member";
import { setActive } from "./set-active";
import { update } from "./update";
import { updateMemberRole } from "./update-member-role";

export const workspacesRouter = {
  list,
  get,
  create,
  update,
  delete: deleteWorkspace,
  listMembers,
  addMember,
  removeMember,
  updateMemberRole,
  listUsersAvailableToAdd,
  setActive,
};
