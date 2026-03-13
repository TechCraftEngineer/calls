/**
 * Types related to files operations
 */

import type { File, FileType } from "../schema/files";

export interface CreateFileData {
  workspaceId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileType: FileType;
  s3Key: string;
  s3Bucket: string;
  s3Url?: string | null;
  isPublic?: boolean;
  metadata?: string | null; // JSON string
}

export interface GetFilesParams {
  workspaceId?: string;
  fileType?: FileType;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
  isPublic?: boolean;
}

export interface FileUploadResult {
  id: string;
  s3Key: string;
  s3Url?: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
}
