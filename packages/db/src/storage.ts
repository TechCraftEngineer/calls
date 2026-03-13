/**
 * New storage layer - clean architecture with services
 * 
 * This replaces the old monolithic storage.ts with proper separation of concerns:
 * - Repositories handle database operations
 * - Services handle business logic
 * - Types are properly separated
 */

// Re-export services for backward compatibility
export {
  callsService,
  usersService,
  promptsService,
  authService,
} from "./services";

// Re-export types
export type {
  GetCallsParams,
  CallWithTranscript,
  CreateCallData,
  EvaluationData,
} from "./types/calls.types";

export type {
  UserUpdateData,
  CreateUserData,
  UpdateUserData,
} from "./types/users.types";

// Re-export repositories for advanced usage
export {
  callsRepository,
  usersRepository,
  promptsRepository,
  systemRepository,
} from "./services";

// Legacy compatibility - map old storage interface to new services
import { callsService, usersService, promptsService, authService } from "./services";

export const storage = {
  // Call operations
  getCall: (id: number) => callsService.getCall(id),
  deleteCall: (callId: number) => callsService.deleteCall(callId),
  getCallByFilename: (filename: string) => callsService.getCallByFilename(filename),
  createCall: (data: any) => callsService.createCall(data),
  getTranscriptByCallId: (callId: number) => callsService.getTranscriptByCallId(callId),
  getEvaluation: (callId: number) => callsService.getEvaluation(callId),
  getCallsWithTranscripts: (params?: any) => callsService.getCallsWithTranscripts(params),
  countCalls: (params?: any) => callsService.countCalls(params),
  addEvaluation: (data: any) => callsService.addEvaluation(data),
  calculateMetrics: () => callsService.calculateMetrics(),
  getEvaluationsStats: (params: any) => callsService.getEvaluationsStats(params),

  // User operations
  getUserByUsername: (username: string) => usersService.getUserByUsername(username),
  verifyPassword: (username: string, password: string) => authService.verifyPassword(username, password),
  verifyWerkzeugHash: (password: string, fullHash: string) => authService.verifyWerkzeugHash(password, fullHash),
  getAllUsers: () => usersService.getAllUsers(),
  getUser: (id: number) => usersService.getUser(id),
  createUser: (username: string, password: string, givenName: string, familyName?: string, internalExtensions?: string | null, mobilePhones?: string | null) => 
    usersService.createUser({ username, password, givenName, familyName, internalExtensions, mobilePhones }),
  updateUserName: (userId: number, givenName: string, familyName?: string) => 
    usersService.updateUserName(userId, { givenName, familyName }),
  updateUserInternalExtensions: (userId: number, internalExtensions: string | null) => 
    usersService.updateUserInternalExtensions(userId, internalExtensions),
  updateUserMobilePhones: (userId: number, mobilePhones: string | null) => 
    usersService.updateUserMobilePhones(userId, mobilePhones),
  updateUserFilters: (userId: number, filterExcludeAnsweringMachine: boolean, filterMinDuration: number, filterMinReplicas: number) => 
    usersService.updateUserFilters(userId, filterExcludeAnsweringMachine, filterMinDuration, filterMinReplicas),
  updateUserReportKpiSettings: (userId: number, data: any) => 
    usersService.updateUserReportKpiSettings(userId, data),
  updateUserTelegramSettings: (userId: number, telegramChatId: string | null, telegramDailyReport: boolean, telegramManagerReport: boolean) => 
    usersService.updateUserTelegramSettings(userId, telegramDailyReport, telegramManagerReport),
  updateUserPassword: (userId: number, newPassword: string) => 
    usersService.updateUserPassword(userId, newPassword),
  deleteUser: (userId: number) => usersService.deleteUser(userId),
  saveTelegramConnectToken: (userId: number, token: string) => 
    usersService.saveTelegramConnectToken(userId, token),
  getUserByTelegramConnectToken: (token: string) => 
    usersService.getUserByTelegramConnectToken(token),
  saveTelegramChatId: (userId: number, chatId: string) => 
    usersService.saveTelegramChatId(userId, chatId),
  saveMaxConnectToken: (userId: number, token: string) => 
    usersService.saveMaxConnectToken(userId, token),
  disconnectTelegram: (userId: number) => usersService.disconnectTelegram(userId),
  disconnectMax: (userId: number) => usersService.disconnectMax(userId),

  // Prompt operations
  getPrompt: (key: string, defaultValue?: string) => promptsService.getPrompt(key, defaultValue),
  getAllPrompts: () => promptsService.getAllPrompts(),
  updatePrompt: (key: string, value: string, description?: string | null) => 
    promptsService.updatePrompt(key, value, description),

  // System operations
  addActivityLog: (level: string, message: string, actor: string) => 
    callsService["systemRepository"].addActivityLog(level, message, actor),
};
