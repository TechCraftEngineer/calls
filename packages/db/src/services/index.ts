/**
 * Services index - exports all services with proper dependency injection
 */

import { CallsRepository } from "../repositories/calls.repository";
import { PromptsRepository } from "../repositories/prompts.repository";
import { SystemRepository } from "../repositories/system.repository";
import { UsersRepository } from "../repositories/users.repository";
import { WorkspacesRepository } from "../repositories/workspaces.repository";
import { AuthService } from "./auth.service";
import { CallsService } from "./calls.service";
import { PromptsService } from "./prompts.service";
import { UsersService } from "./users.service";
import { WorkspacesService } from "./workspaces.service";

// Initialize repositories
const callsRepository = new CallsRepository();
const usersRepository = new UsersRepository();
const promptsRepository = new PromptsRepository();
const systemRepository = new SystemRepository();
const workspacesRepository = new WorkspacesRepository();

// Initialize services with dependency injection
export const callsService = new CallsService(callsRepository, systemRepository);
export const workspacesService = new WorkspacesService(workspacesRepository);
export const usersService = new UsersService(usersRepository, systemRepository);
export const promptsService = new PromptsService(
  promptsRepository,
  systemRepository,
);
export const authService = new AuthService(usersRepository);

// Export repositories for direct access if needed
export {
  callsRepository,
  usersRepository,
  promptsRepository,
  systemRepository,
  workspacesRepository,
};
