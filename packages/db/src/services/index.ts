/**
 * Services index - exports all services with proper dependency injection
 */

import { callsRepository } from "../repositories/calls.repository";
import { filesRepository } from "../repositories/files.repository";
import { promptsRepository } from "../repositories/prompts.repository";
import { systemRepository } from "../repositories/system.repository";
import { usersRepository } from "../repositories/users.repository";
import { workspacesRepository } from "../repositories/workspaces.repository";
import { AuthService } from "./auth.service";
import { CallsService } from "./calls.service";
import { FilesService } from "./files.service";
import { PromptsService } from "./prompts.service";
import { SettingsService } from "./settings.service";
import { UsersService } from "./users.service";
import { WorkspacesService } from "./workspaces.service";

// Initialize services with dependency injection
export const callsService = new CallsService(callsRepository, systemRepository);
export const filesService = new FilesService(filesRepository, systemRepository);
export const workspacesService = new WorkspacesService(workspacesRepository);
export const usersService = new UsersService(usersRepository, systemRepository);
export const promptsService = new PromptsService(
  promptsRepository,
  systemRepository,
);
export const settingsService = new SettingsService(
  promptsRepository,
  systemRepository,
);
export const authService = new AuthService(usersRepository);

// Export repositories for direct access if needed
export {
  callsRepository,
  filesRepository,
  promptsRepository,
  systemRepository,
  usersRepository,
  workspacesRepository,
};
