/**
 * Calls repository - handles all database operations for calls
 * Refactored into modular components for better maintainability
 */

import type { ManagerStatsRow } from "./calls/get-evaluations-stats";
import type { EnrichedManagerStats } from "./calls/enrich-stats";
import { callsCrud } from "./calls/crud";
import { callsTranscripts } from "./calls/transcripts";
import { callsEvaluations } from "./calls/evaluations";
import { callsQueries } from "./calls/queries";
import { callsStats } from "./calls/stats";
import { callsEnrichStats } from "./calls/enrich-stats";

export const callsRepository = {
  // Basic CRUD operations
  ...callsCrud,

  // Transcript operations
  getTranscriptByCallId: callsTranscripts.getTranscriptByCallId,
  upsertTranscript: callsTranscripts.upsertTranscript,

  // Evaluation operations
  getEvaluation: callsEvaluations.getEvaluation,
  addEvaluation: callsEvaluations.addEvaluation,

  // Query operations
  findWithTranscriptsAndEvaluations: callsQueries.findWithTranscriptsAndEvaluations,
  countCalls: callsQueries.countCalls,
  findDistinctManagers: callsQueries.findDistinctManagers,

  // Statistics operations
  getMetrics: callsStats.getMetrics,
  getEvaluationsStats: callsStats.getEvaluationsStats,
  getLowRatedCallsCount: callsStats.getLowRatedCallsCount,
  getCallSummariesByManager: callsStats.getCallSummariesByManager,
  getKpiStats: callsStats.getKpiStats,

  // Enrichment operations
  enrichStatsWithKpi: callsEnrichStats.enrichStatsWithKpi,
};

export type CallsRepository = typeof callsRepository;
