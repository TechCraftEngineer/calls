/**
 * Calls service - handles business logic for call operations
 */

import type { EnrichedManagerStats } from "../repositories/calls/enrich-stats";
import type { ManagerStatsRow } from "../repositories/calls/get-evaluations-stats";
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
import { ValidationError } from "../validation/call-schemas";

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

  async getCallByFilename(filename: string, workspaceId?: string): Promise<Call | null> {
    return this.callsRepository.findByFilename(filename, workspaceId);
  }

  async getCallByExternalId(
    workspaceId: string,
    provider: string,
    externalId: string,
  ): Promise<Call | null> {
    return this.callsRepository.findByExternalId(workspaceId, provider, externalId);
  }

  async findLatestContactByPhone(workspaceId: string, phone: string) {
    return this.callsRepository.findLatestByPhone(workspaceId, phone);
  }

  async createCall(data: CreateCallData): Promise<string> {
    try {
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
    } catch (error) {
      // Добавляем детальное логирование ошибок валидации
      if (error instanceof Error) {
        const errorMessage =
          error instanceof ValidationError ? `Validation errors: ${error.message}` : error.message;

        try {
          await this.systemRepository.addActivityLog(
            "ERROR",
            `Failed to create call from file ${data.filename}: ${errorMessage}`,
            "system",
            data.workspaceId,
          );
        } catch {
          // Игнорируем ошибки логирования
        }
      }
      throw error;
    }
  }

  async createCallWithResult(data: CreateCallData): Promise<{ id: string; created: boolean }> {
    const result = await this.callsRepository.createWithResult(data);

    try {
      await this.systemRepository.addActivityLog(
        "INFO",
        `Call ${result.id} ${result.created ? "created" : "resolved"} from file: ${data.filename}`,
        "system",
        data.workspaceId,
      );
    } catch {
      // Игнорируем ошибки логирования
    }

    return result;
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
    callType?: string | null;
    callTopic?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<string> {
    return this.callsRepository.upsertTranscript(data);
  }

  async updateCustomerName(callId: string, customerName: string | null): Promise<void> {
    try {
      await this.callsRepository.updateCustomerName(callId, customerName);
    } catch (error) {
      if (error instanceof Error) {
        try {
          const call = await this.callsRepository.findById(callId);
          if (call) {
            await this.systemRepository.addActivityLog(
              "ERROR",
              `Failed to update customer name for call ${callId}: ${error.message}`,
              "system",
              call.workspaceId,
            );
          }
        } catch {
          // Игнорируем ошибки логирования
        }
      }
      throw error;
    }
  }

  async updateCallRecording(callId: string, data: { fileId: string | null }): Promise<void> {
    try {
      await this.callsRepository.updateRecording(callId, data);
    } catch (error) {
      if (error instanceof Error) {
        try {
          const call = await this.callsRepository.findById(callId);
          if (call) {
            await this.systemRepository.addActivityLog(
              "ERROR",
              `Failed to update recording for call ${callId}: ${error.message}`,
              "system",
              call.workspaceId,
            );
          }
        } catch {
          // Игнорируем ошибки логирования
        }
      }
      throw error;
    }
  }

  async updateEnhancedAudio(callId: string, enhancedAudioFileId: string | null): Promise<void> {
    try {
      await this.callsRepository.updateEnhancedAudio(callId, enhancedAudioFileId);
    } catch (error) {
      if (error instanceof Error) {
        try {
          const call = await this.callsRepository.findById(callId);
          if (call) {
            await this.systemRepository.addActivityLog(
              "ERROR",
              `Failed to update enhanced audio for call ${callId}: ${error.message}`,
              "system",
              call.workspaceId,
            );
          }
        } catch {
          // Игнорируем ошибки логирования
        }
      }
      throw error;
    }
  }

  async updateCallPbxBinding(
    callId: string,
    data: {
      internalNumber?: string | null;
      source?: string | null;
      name?: string | null;
    },
  ): Promise<void> {
    await this.callsRepository.updatePbxBinding(callId, data);
  }

  /**
   * Транзакционное обновление записи звонка и файла
   */
  async updateCallWithRecording(
    callId: string,
    data: {
      fileId: string | null;
      enhancedAudioFileId?: string | null;
      customerName?: string | null;
    },
  ): Promise<void> {
    try {
      await this.callsRepository.updateWithRecording(callId, data);

      // Логируем успешное транзакционное обновление
      try {
        const call = await this.callsRepository.findById(callId);
        if (call) {
          await this.systemRepository.addActivityLog(
            "INFO",
            `Call ${callId} updated with recording data (fileId: ${data.fileId}, enhancedAudio: ${data.enhancedAudioFileId})`,
            "system",
            call.workspaceId,
          );
        }
      } catch {
        // Игнорируем ошибки логирования
      }
    } catch (error) {
      if (error instanceof Error) {
        try {
          const call = await this.callsRepository.findById(callId);
          if (call) {
            await this.systemRepository.addActivityLog(
              "ERROR",
              `Failed to update call ${callId} with recording data: ${error.message}`,
              "system",
              call.workspaceId,
            );
          }
        } catch {
          // Игнорируем ошибки логирования
        }
      }
      throw error;
    }
  }

  /**
   * Транзакционное обновление PBX привязки и имени клиента
   */
  async updateCallPbxBindingWithCustomer(
    callId: string,
    data: {
      internalNumber?: string | null;
      source?: string | null;
      name?: string | null;
      customerName?: string | null;
    },
  ): Promise<void> {
    try {
      await this.callsRepository.updatePbxBindingWithCustomer(callId, data);

      // Логируем успешное транзакционное обновление
      try {
        const call = await this.callsRepository.findById(callId);
        if (call) {
          await this.systemRepository.addActivityLog(
            "INFO",
            `Call ${callId} updated with PBX binding and customer data`,
            "system",
            call.workspaceId,
          );
        }
      } catch {
        // Игнорируем ошибки логирования
      }
    } catch (error) {
      if (error instanceof Error) {
        try {
          const call = await this.callsRepository.findById(callId);
          if (call) {
            await this.systemRepository.addActivityLog(
              "ERROR",
              `Failed to update call ${callId} with PBX binding: ${error.message}`,
              "system",
              call.workspaceId,
            );
          }
        } catch {
          // Игнорируем ошибки логирования
        }
      }
      throw error;
    }
  }

  async getEvaluation(callId: string): Promise<CallEvaluation | null> {
    return this.callsRepository.getEvaluation(callId);
  }

  async getCallsWithTranscripts(params: GetCallsParams = {}): Promise<CallWithTranscript[]> {
    return this.callsRepository.findWithTranscriptsAndEvaluations(params);
  }

  async countCalls(params: Omit<GetCallsParams, "limit" | "offset"> = {}): Promise<number> {
    return this.callsRepository.countCalls(params);
  }

  async getDistinctManagers(params: GetCallManagersParams = {}): Promise<string[]> {
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
  }): Promise<Record<string, ManagerStatsRow>> {
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

  async getCallSummariesByManager(params: {
    workspaceId?: string;
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
    excludePhoneNumbers?: string[];
    limitPerManager?: number;
  }): Promise<Record<string, string[]>> {
    return this.callsRepository.getCallSummariesByManager(params);
  }

  async getKpiStats(params: {
    workspaceId: string;
    dateFrom: string;
    dateTo: string;
    excludePhoneNumbers?: string[];
  }) {
    return this.callsRepository.getKpiStats(params);
  }

  async enrichStatsWithKpi(
    stats: Record<string, ManagerStatsRow>,
    workspaceId: string,
    reportType?: "daily" | "weekly" | "monthly",
  ): Promise<Record<string, EnrichedManagerStats>> {
    return this.callsRepository.enrichStatsWithKpi(stats, workspaceId, reportType);
  }
}
