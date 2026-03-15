import { addMember } from "./add-member";
import { create } from "./create";
import { createInvitation } from "./create-invitation";
import { deleteWorkspace } from "./delete";
import { get } from "./get";
import { getInvitationByToken } from "./get-invitation-by-token";
import { list } from "./list";
import { listInvitations } from "./list-invitations";
import { listMembers } from "./list-members";
import { listUsersAvailableToAdd } from "./list-users-available-to-add";
import { removeMember } from "./remove-member";
import { revokeInvitation } from "./revoke-invitation";
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
  createInvitation,
  listInvitations,
  revokeInvitation,
  getInvitationByToken,
};
