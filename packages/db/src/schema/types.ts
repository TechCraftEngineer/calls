/**
 * TypeScript type definitions for all database tables
 */

// Import all table definitions as types
import type { callEvaluations, calls, transcripts } from "./calls";
import type { activityLog, prompts } from "./system";
import type { users } from "./users";

// Calls domain types
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;

export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;

export type CallEvaluation = typeof callEvaluations.$inferSelect;
export type NewCallEvaluation = typeof callEvaluations.$inferInsert;

// Users domain types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// System domain types
export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
