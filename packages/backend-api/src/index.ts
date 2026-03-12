/**
 * Backend API - main API layer for the project.
 * oRPC router with typed client. Use createBackendClient for frontend/HTTP consumers.
 */

export { createBackendContext, type AuthLike, type BackendContext } from "./orpc";
export { backendRouter, type BackendRouter } from "./orpc-root";
export { createBackendClient, type BackendApiClient } from "./client";
export { createBackendApiWithContext } from "./server";
