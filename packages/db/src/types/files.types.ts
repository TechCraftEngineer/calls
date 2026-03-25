/**
 * Types related to files operations
 */

import type { FileType } from "../schema";

export type { FileType };

export interface CreateFileData {
  workspaceId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileType: FileType;
  storageKey: string;
  metadata?: Record<string, unknown> | null;
  /** Длительность аудио в секундах (опционально; обычно для call_recording). */
  durationSeconds?: number | null;
}

export interface GetFilesParams {
  workspaceId?: string;
  fileType?: FileType;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface FileUploadResult {
  id: string;
  storageKey: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
}
