/**
 * Calls repository - handles all database operations for calls
 * Refactored into modular components for better maintainability
 */

import { callsCrud } from "./calls/crud";
import { callsEnrichStats } from "./calls/enrich-stats";
import { callsEvaluations } from "./calls/evaluations";
import { callsQueries } from "./calls/queries";
import { callsStats } from "./calls/stats";
import { callsTranscripts } from "./calls/transcripts";

export const callsRepository = {
  // Basic CRUD operations
  ...callsCrud,

  // Transcript operations
  getTranscriptByCallId: callsTranscripts.getTranscriptByCallId,
  upsertTranscript: callsTranscripts.upsertTranscript,

  // Transcription status operations
  markTranscriptionFailed: callsCrud.markTranscriptionFailed,

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
  getDailyKpiStats: callsStats.getDailyKpiStats,

  // Enrichment operations
  enrichStatsWithKpi: callsEnrichStats.enrichStatsWithKpi,
};

export type CallsRepository = typeof callsRepository;
