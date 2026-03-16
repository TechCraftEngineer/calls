/**
 * Services index - exports all services with proper dependency injection
 */

import { callsRepository } from "../repositories/calls.repository";
import { filesRepository } from "../repositories/files.repository";
import { invitationsRepository } from "../repositories/invitations.repository";
import { promptsRepository } from "../repositories/prompts.repository";
import { systemRepository } from "../repositories/system.repository";
import { userWorkspaceSettingsRepository } from "../repositories/user-workspace-settings.repository";
import { usersRepository } from "../repositories/users.repository";
import { workspaceIntegrationsRepository } from "../repositories/workspace-integrations.repository";
import { workspacesRepository } from "../repositories/workspaces.repository";
import { CallsService } from "./calls.service";
import { FilesService } from "./files.service";
import { InvitationsService } from "./invitations.service";
import { SettingsService } from "./settings.service";
import { UsersService } from "./users.service";
import { WorkspacesService } from "./workspaces.service";

// Initialize services with dependency injection
export const callsService = new CallsService(callsRepository, systemRepository);
export const filesService = new FilesService(filesRepository, systemRepository);
export const workspacesService = new WorkspacesService(workspacesRepository);
export const usersService = new UsersService(usersRepository, systemRepository);
export const invitationsService = new InvitationsService(
  workspacesService,
  usersService,
  userWorkspaceSettingsRepository,
  invitationsRepository,
);
export const settingsService = new SettingsService(
  promptsRepository,
  systemRepository,
  workspaceIntegrationsRepository,
);
// Export repositories for direct access if needed
export {
  callsRepository,
  filesRepository,
  invitationsRepository,
  promptsRepository,
  systemRepository,
  usersRepository,
  workspacesRepository,
};
