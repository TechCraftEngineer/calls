/**
 * Backend API - oRPC router for calls/transcription app.
 * Replaces Python FastAPI backend with type-safe oRPC + Hono.
 */

export { createBackendContext } from "./orpc";
export { backendRouter, type BackendRouter } from "./orpc-root";
