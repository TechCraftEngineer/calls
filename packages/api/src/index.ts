/**
 * Backend API - main API layer for the project.
 * oRPC router with typed client. Use createBackendClient for frontend/HTTP consumers.
 */

export { createLogger } from "./logger";
export type { BackendContext, WorkspaceRole } from "./orpc";
export { createBackendContext } from "./orpc";
export type { BackendRouter } from "./orpc-root";
export { backendRouter } from "./orpc-root";
export { createBackendApiWithContext } from "./server";
