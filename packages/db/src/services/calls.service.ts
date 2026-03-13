/**
 * Calls service - handles business logic for call operations
 */

import type { CallsRepository } from "../repositories/calls.repository";
import type { SystemRepository } from "../repositories/system.repository";
import type {
  CallWithTranscript,
  CreateCallData,
  EvaluationData,
  GetCallsParams,
} from "../types/calls.types";

export class CallsService {
  constructor(
    private callsRepository: CallsRepository,
    private systemRepository: SystemRepository,
  ) {}

  async getCall(id: string): Promise<any | null> {
    return this.callsRepository.findById(id);
  }

  async deleteCall(callId: string): Promise<boolean> {
    const result = await this.callsRepository.delete(callId);

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `Call ${callId} deleted`,
        "system",
      );
    }

    return result;
  }

  async getCallByFilename(
    filename: string,
    workspaceId?: string,
  ): Promise<any | null> {
    return this.callsRepository.findByFilename(filename, workspaceId);
  }

  async createCall(data: CreateCallData): Promise<string> {
    const callId = await this.callsRepository.create(data);

    await this.systemRepository.addActivityLog(
      "INFO",
      `Call ${callId} created from file: ${data.filename}`,
      "system",
    );

    return callId;
  }

  async getTranscriptByCallId(callId: string): Promise<any | null> {
    return this.callsRepository.getTranscriptByCallId(callId);
  }

  async getEvaluation(callId: string): Promise<any | null> {
    return this.callsRepository.getEvaluation(callId);
  }

  async getCallsWithTranscripts(
    params: GetCallsParams = {},
  ): Promise<CallWithTranscript[]> {
    return this.callsRepository.findWithTranscriptsAndEvaluations(params);
  }

  async countCalls(
    params: Omit<GetCallsParams, "limit" | "offset"> = {},
  ): Promise<number> {
    return this.callsRepository.countCalls(params);
  }

  async addEvaluation(data: EvaluationData): Promise<string> {
    const evaluationId = await this.callsRepository.addEvaluation(data);

    await this.systemRepository.addActivityLog(
      "INFO",
      `Evaluation added for call ${data.callId}`,
      "system",
    );

    return evaluationId;
  }

  async calculateMetrics(workspaceId?: string): Promise<{
    total_calls: number;
    transcribed: number;
    avg_duration: number;
    last_sync: string | null;
  }> {
    return this.callsRepository.getMetrics(workspaceId);
  }

  async getEvaluationsStats(params: {
    workspaceId?: string;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
  }): Promise<Record<string, any>> {
    return this.callsRepository.getEvaluationsStats(params);
  }
}
