/**
 * Calls service - handles business logic for call operations
 */

import type { CallsRepository } from "../repositories/calls.repository";
import type { SystemRepository } from "../repositories/system.repository";
import type { Call, CallEvaluation, Transcript } from "../schema";
import type {
  CallWithTranscript,
  CreateCallData,
  EvaluationData,
  GetCallManagersParams,
  GetCallsParams,
} from "../types/calls.types";

export class CallsService {
  constructor(
    private callsRepository: CallsRepository,
    private systemRepository: SystemRepository,
  ) {}

  async getCall(id: string): Promise<Call | null> {
    return this.callsRepository.findById(id);
  }

  async deleteCall(callId: string): Promise<boolean> {
    const call = await this.callsRepository.findById(callId);
    const result = await this.callsRepository.delete(callId);

    if (result && call) {
      try {
        await this.systemRepository.addActivityLog(
          "INFO",
          `Call ${callId} deleted`,
          "system",
          call.workspaceId,
        );
      } catch {
        // Игнорируем ошибки логирования
      }
    }

    return result;
  }

  async getCallByFilename(
    filename: string,
    workspaceId?: string,
  ): Promise<Call | null> {
    return this.callsRepository.findByFilename(filename, workspaceId);
  }

  async findLatestContactByPhone(workspaceId: string, phone: string) {
    return this.callsRepository.findLatestByPhone(workspaceId, phone);
  }

  async createCall(data: CreateCallData): Promise<string> {
    const callId = await this.callsRepository.create(data);

    try {
      await this.systemRepository.addActivityLog(
        "INFO",
        `Call ${callId} created from file: ${data.filename}`,
        "system",
        data.workspaceId,
      );
    } catch {
      // Игнорируем ошибки логирования
    }

    return callId;
  }

  async getTranscriptByCallId(callId: string): Promise<Transcript | null> {
    return this.callsRepository.getTranscriptByCallId(callId);
  }

  async upsertTranscript(data: {
    callId: string;
    text?: string | null;
    rawText?: string | null;
    title?: string | null;
    sentiment?: string | null;
    confidence?: number | null;
    summary?: string | null;
    callTopic?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<string> {
    return this.callsRepository.upsertTranscript(data);
  }

  async updateCallDuration(
    callId: string,
    durationSeconds: number,
  ): Promise<void> {
    await this.callsRepository.updateDuration(callId, durationSeconds);
  }

  async updateCustomerName(
    callId: string,
    customerName: string | null,
  ): Promise<void> {
    await this.callsRepository.updateCustomerName(callId, customerName);
  }

  async updateCallRecording(
    callId: string,
    data: { fileId: string | null; sizeBytes: number | null },
  ): Promise<void> {
    await this.callsRepository.updateRecording(callId, data);
  }

  async getEvaluation(callId: string): Promise<CallEvaluation | null> {
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

  async getDistinctManagers(
    params: GetCallManagersParams = {},
  ): Promise<string[]> {
    return this.callsRepository.findDistinctManagers(params);
  }

  async addEvaluation(data: EvaluationData): Promise<string> {
    const evaluationId = await this.callsRepository.addEvaluation(data);

    try {
      const call = await this.callsRepository.findById(data.callId);
      if (call) {
        await this.systemRepository.addActivityLog(
          "INFO",
          `Evaluation added for call ${data.callId}`,
          "system",
          call.workspaceId,
        );
      }
    } catch {
      // Игнорируем ошибки логирования
    }

    return evaluationId;
  }

  async calculateMetrics(
    workspaceId?: string,
    excludePhoneNumbers?: string[],
  ): Promise<{
    totalCalls: number;
    transcribed: number;
    avgDuration: number;
    lastSync: string | null;
  }> {
    return this.callsRepository.getMetrics(workspaceId, excludePhoneNumbers);
  }

  async getEvaluationsStats(params: {
    workspaceId?: string;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
    excludePhoneNumbers?: string[];
  }): Promise<Record<string, unknown>> {
    return this.callsRepository.getEvaluationsStats(params);
  }

  async getLowRatedCallsCount(params: {
    workspaceId?: string;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
    excludePhoneNumbers?: string[];
    maxScore?: number;
  }): Promise<Record<string, number>> {
    return this.callsRepository.getLowRatedCallsCount(params);
  }

  async getKpiStats(params: {
    workspaceId: string;
    dateFrom: string;
    dateTo: string;
    excludePhoneNumbers?: string[];
  }) {
    return this.callsRepository.getKpiStats(params);
  }
}
