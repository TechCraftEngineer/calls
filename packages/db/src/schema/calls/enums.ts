/**
 * Enums for calls table
 */

import { pgEnum } from "drizzle-orm/pg-core";

export const callDirectionEnum = pgEnum("call_direction", ["inbound", "outbound"]);

export const callStatusEnum = pgEnum("call_status", ["missed", "answered", "voicemail", "failed"]);
