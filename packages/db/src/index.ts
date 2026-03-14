/**
 * Main entry point for the database package
 * Exports all schemas, repositories, services, and types
 */

// Database client
export { db } from "./client";
export { systemRepository } from "./repositories/system.repository";
export {
  userFilterSettingsRepository,
  userKpiSettingsRepository,
  userNotificationSettingsRepository,
  userReportSettingsRepository,
} from "./repositories/user-settings.repository";
// Repositories
export { usersRepository } from "./repositories/users.repository";
// Schemas and types
export * from "./schema";

// Services
export { UsersService } from "./services/users.service";

// Types
export type {
  CreateUserData,
  UpdateUserData,
  UserUpdateData,
} from "./types/users.types";

// Validators
export { ValidationError } from "./validators/user.validators";
