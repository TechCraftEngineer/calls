/**
 * Backend API - main API layer for the project.
 * oRPC router with typed client. Use createBackendClient for frontend/HTTP consumers.
 */

export { type BackendApiClient, createBackendClient } from "./client";
export {
  type AuthLike,
  type BackendContext,
  createBackendContext,
} from "./orpc";
export { type BackendRouter, backendRouter } from "./orpc-root";
export { createBackendApiWithContext } from "./server";
export { createLogger } from "./logger";
export { extractUserFields } from "./user-profile";
