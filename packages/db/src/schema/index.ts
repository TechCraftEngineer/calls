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
export { 
  users, 
  userIntegrations, 
  userFilters, 
  userReportSettings, 
  userKpiSettings 
} from "./users";

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
  UserIntegrations,
  UserFilters,
  UserReportSettings,
  UserKpiSettings,
} from "./types";
