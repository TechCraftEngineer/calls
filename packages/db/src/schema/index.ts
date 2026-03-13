/**
 * Database schema exports - Main entry point for all database tables and types
 *
 * This file provides a centralized export point for all database schemas,
 * making it easy to import tables and types from a single location.
 */

// Legacy exports for backward compatibility
export * from "./auth";
// Export all table definitions
export { callEvaluations, calls, transcripts } from "./calls";
export { activityLog, prompts } from "./system";

// Export all TypeScript types
export type {
  ActivityLog,
  Call,
  CallEvaluation,
  NewActivityLog,
  NewCall,
  NewCallEvaluation,
  NewPrompt,
  NewTranscript,
  NewUser,
  Prompt,
  Transcript,
  User,
} from "./types";
export { users } from "./users";
