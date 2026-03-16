import { checkUserPassword } from "./check-user-password";
import { create } from "./create";
import { deleteWorkspace } from "./delete";
import { get } from "./get";
import { invitationsRouter } from "./invitations";
import { list } from "./list";
import { membersRouter } from "./members";
import { setActive } from "./set-active";
import { update } from "./update";

export const workspacesRouter = {
  list,
  get,
  create,
  update,
  delete: deleteWorkspace,
  setActive,
  checkUserPassword,

  listMembers: membersRouter.listMembers,
  addMember: membersRouter.addMember,
  removeMember: membersRouter.removeMember,
  updateMemberRole: membersRouter.updateMemberRole,
  listUsersAvailableToAdd: membersRouter.listUsersAvailableToAdd,

  createInvitation: invitationsRouter.createInvitation,
  listInvitations: invitationsRouter.listInvitations,
  revokeInvitation: invitationsRouter.revokeInvitation,
  updateInvitationSettings: invitationsRouter.updateInvitationSettings,
  getInvitationByToken: invitationsRouter.getInvitationByToken,
  acceptInvitation: invitationsRouter.acceptInvitation,
  acceptInvitationForExistingUser:
    invitationsRouter.acceptInvitationForExistingUser,
};
