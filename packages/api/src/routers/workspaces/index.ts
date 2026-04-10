import { checkUserPassword } from "./check-user-password";
import { completeOnboarding } from "./complete-onboarding";
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
  completeOnboarding,

  listMembers: membersRouter.listMembers,
  addMember: membersRouter.addMember,
  removeMember: membersRouter.removeMember,
  updateMemberRole: membersRouter.updateMemberRole,
  listUsersAvailableToAdd: membersRouter.listUsersAvailableToAdd,

  createInvitation: invitationsRouter.createInvitation,
  createLinkInvitation: invitationsRouter.createLinkInvitation,
  listInvitations: invitationsRouter.listInvitations,
  revokeInvitation: invitationsRouter.revokeInvitation,
  updateInvitationSettings: invitationsRouter.updateInvitationSettings,
  getInvitationByToken: invitationsRouter.getInvitationByToken,
  getPendingInvitationsForCurrentUser: invitationsRouter.getPendingInvitationsForCurrentUser,
  validateInvitationToken: invitationsRouter.validateInvitationToken,
  acceptInvitation: invitationsRouter.acceptInvitation,
  acceptInvitationForExistingUser: invitationsRouter.acceptInvitationForExistingUser,
};
