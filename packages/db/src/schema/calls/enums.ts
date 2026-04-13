/**
 * Enums for calls table
 */

import { pgEnum } from "drizzle-orm/pg-core";

export const callDirectionEnum = pgEnum("call_direction", ["inbound", "outbound"]);

export const callStatusEnum = pgEnum("call_status", [
  "missed",
  "answered",
  "voicemail",
  "failed",
  "technical_error",
]);

export const processingStatusEnum = pgEnum("processing_status", [
  "pending",
  "transcribing",
  "transcribed",
  "evaluating",
  "completed",
  "failed",
]);
