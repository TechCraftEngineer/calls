# Invitation System Refactoring - Complete

## Summary

Successfully refactored the invitation system to use the correct architecture where invitation status is stored in `workspace_members` table instead of `users` table.

## Changes Made

### 1. Schema Changes

#### `workspace_members` table (packages/db/src/schema/workspace/members.ts)
Added invitation fields:
- `status` - 'active' | 'pending'
- `invitationToken` - unique token for accepting invitation
- `invitationExpiresAt` - expiration date
- `invitedBy` - user who sent the invitation

#### `users` table (packages/db/src/schema/auth/user.ts)
No changes needed - already clean, no invitation fields.

### 2. Service Layer

#### InvitationsService (packages/db/src/services/invitations.service.ts)
Completely rewritten with new methods:

- `createInvitation()` - Creates user if needed, adds to workspace with status='pending'
  - Checks if user exists
  - Creates user without password if new
  - Generates invitation token
  - Adds workspace_member with pending status

- `listPendingByWorkspace()` - Gets all pending members for a workspace

- `acceptInvitation()` - Activates membership
  - Finds member by token
  - Validates expiration
  - Updates status to 'active'
  - Clears invitation token

- `resendInvitation()` - Generates new token for pending member

- `revokeInvitation()` - Removes pending member from workspace

#### UsersService (packages/db/src/services/users.service.ts)
Removed invitation-related methods:
- ~~`createPendingUser()`~~
- ~~`activatePendingUser()`~~
- ~~`getUserByInvitationToken()`~~
- ~~`updateInvitationToken()`~~
- ~~`deletePendingUser()`~~

### 3. Repository Layer

#### WorkspacesRepository (packages/db/src/repositories/workspaces.repository.ts)
Added new methods:

- `addPendingMember()` - Creates workspace_member with status='pending'
- `getPendingMembers()` - Gets all pending members for workspace
- `getMemberByInvitationToken()` - Finds member by invitation token
- `activateMember()` - Updates member status to 'active'
- `updateMemberInvitationToken()` - Updates invitation token and expiration

Updated existing methods:
- `addMember()` - Now explicitly sets status='active'
- `getMembers()` - Now returns status and invitation fields
- `getMember()` - Now includes status field in return type

#### UsersRepository (packages/db/src/repositories/users.repository.ts)
Removed invitation-related methods:
- ~~`createPending()`~~
- ~~`findByInvitationToken()`~~
- ~~`activateUser()`~~
- ~~`updateInvitationToken()`~~
- ~~`delete()`~~

## Architecture Benefits

✅ **Correct data model** - Invitation status is a property of workspace membership, not the user
✅ **Flexibility** - User can be active in one workspace and pending in another
✅ **Unified UI** - Can use existing user settings components for both active and pending members
✅ **Simplicity** - No separate invitations table needed
✅ **Pre-configuration** - Admins can configure users before they accept invitations

## Migration Required

User needs to create migration to:
1. Add new fields to `workspace_members` table
2. Migrate existing invitations data if any

## Next Steps

### API Layer Updates Needed
- Update `packages/api/src/routers/workspaces/create-invitation.ts`
- Update invitation acceptance endpoints
- Remove `update-invitation-settings.ts` (no longer needed)

### UI Updates Needed
- Update `apps/app/src/app/users/page.tsx` to show pending status badge
- Update or remove `apps/app/src/components/features/workspaces/pending-invitations.tsx`
- Remove `apps/app/src/components/features/workspaces/configure-invitation-settings-modal.tsx`
- Add status filter (All / Active / Pending)

### WorkspacesService Updates Needed
Add wrapper methods that delegate to repository:
- `addPendingMember()`
- `getPendingMembers()`
- `getMemberByInvitationToken()`
- `activateMember()`
- `updateMemberInvitationToken()`

## Example Flow

### Inviting a New User
```typescript
// 1. Create invitation
const result = await invitationsService.createInvitation(
  workspaceId,
  "new@example.com",
  "member",
  adminId
);
// Creates user + workspace_member with status='pending'

// 2. Admin configures user through normal UI
await usersService.updateUserReportKpiSettings(
  result.userId,
  workspaceId,
  { /* settings */ }
);
// Settings saved to user_workspace_settings

// 3. User accepts invitation
await invitationsService.acceptInvitation(result.token, "password123");
// Updates workspace_member status to 'active'

// 4. User logs in with all settings already applied
```

### Inviting an Existing User
```typescript
// 1. Create invitation
const result = await invitationsService.createInvitation(
  workspaceId,
  "existing@example.com",
  "member",
  adminId
);
// Adds workspace_member with status='pending' (no password needed)

// 2. User accepts invitation
await invitationsService.acceptInvitation(result.token);
// Updates workspace_member status to 'active'

// 3. User sees new workspace in their list
```
