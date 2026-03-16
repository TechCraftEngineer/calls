import { acceptInvitation } from "./accept-invitation";
import { acceptInvitationForExistingUser } from "./accept-invitation-for-existing-user";
import { createInvitation } from "./create-invitation";
import { getInvitationByToken } from "./get-invitation-by-token";
import { listInvitations } from "./list-invitations";
import { revokeInvitation } from "./revoke-invitation";
import { updateInvitationSettings } from "./update-invitation-settings";

export const invitationsRouter = {
  createInvitation,
  listInvitations,
  revokeInvitation,
  updateInvitationSettings,
  getInvitationByToken,
  acceptInvitation,
  acceptInvitationForExistingUser,
};
