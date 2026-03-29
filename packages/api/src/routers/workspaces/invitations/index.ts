import { acceptInvitation } from "./accept-invitation";
import { acceptInvitationForExistingUser } from "./accept-invitation-for-existing-user";
import { createInvitation } from "./create-invitation";
import { createLinkInvitation } from "./create-link-invitation";
import { getInvitationByToken } from "./get-invitation-by-token";
import { getPendingInvitationsForCurrentUser } from "./get-pending-invitations-for-current-user";
import { listInvitations } from "./list-invitations";
import { revokeInvitation } from "./revoke-invitation";
import { updateInvitationSettings } from "./update-invitation-settings";
import { validateInvitationToken } from "./validate-invitation-token";

export const invitationsRouter = {
  createInvitation,
  createLinkInvitation,
  listInvitations,
  revokeInvitation,
  updateInvitationSettings,
  getInvitationByToken,
  getPendingInvitationsForCurrentUser,
  validateInvitationToken,
  acceptInvitation,
  acceptInvitationForExistingUser,
};
