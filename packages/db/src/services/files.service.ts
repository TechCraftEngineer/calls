/**
 * Files service - handles business logic for file operations
 */

import { env } from "@calls/config";
import { generateS3Key, getDownloadUrl, uploadBufferToS3 } from "@calls/lib";
import type { FilesRepository } from "../repositories/files.repository";
import type { SystemRepository } from "../repositories/system.repository";
import type { CreateFileData, FileType } from "../types";

export class FilesService {
  constructor(
    private filesRepository: FilesRepository,
    private systemRepository: SystemRepository,
  ) {}

  async uploadFile(
    workspaceId: string,
    fileData: {
      originalName: string;
      buffer: Buffer | Uint8Array;
      mimeType: string;
      fileType: FileType;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{
    id: string;
    storageKey: string;
    filename: string;
    sizeBytes: number;
  }> {
    const storageKey = generateS3Key(
      `${fileData.fileType}/${fileData.originalName}`,
    );

    await uploadBufferToS3(storageKey, fileData.buffer, fileData.mimeType);

    const fileRecord = await this.filesRepository.create({
      workspaceId,
      filename: storageKey,
      originalName: fileData.originalName,
      mimeType: fileData.mimeType,
      sizeBytes: fileData.buffer.length,
      fileType: fileData.fileType,
      storageKey,
      metadata: fileData.metadata ?? null,
    });

    if (!fileRecord) {
      throw new Error("Failed to create file record");
    }

    // Логируем создание файла
    await this.systemRepository.addActivityLog(
      "INFO",
      `File uploaded: ${fileData.originalName} (${fileData.fileType})`,
      "system",
    );

    return {
      id: fileRecord.id,
      storageKey: fileRecord.storageKey,
      filename: fileRecord.filename,
      sizeBytes: fileRecord.sizeBytes,
    };
  }

  async uploadCallRecording(
    workspaceId: string,
    originalName: string,
    buffer: Buffer | Uint8Array,
  ): Promise<{
    id: string;
    storageKey: string;
    filename: string;
    sizeBytes: number;
  }> {
    return this.uploadFile(workspaceId, {
      originalName,
      buffer,
      mimeType: "audio/mpeg",
      fileType: "call_recording",
    });
  }

  async getFileDownloadUrl(storageKey: string): Promise<string> {
    const file = await this.filesRepository.findByStorageKey(storageKey);
    if (!file) {
      throw new Error(`File not found: ${storageKey}`);
    }

    return getDownloadUrl(storageKey);
  }

  async getFilesByWorkspace(workspaceId: string, fileType?: FileType) {
    return this.filesRepository.findByWorkspaceId({
      workspaceId,
      fileType,
    });
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    const file = await this.filesRepository.deleteByStorageKey(storageKey);

    if (file) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `File deleted: ${file.originalName}`,
        "system",
      );
      return true;
    }

    return false;
  }

  async getFileById(id: string) {
    return this.filesRepository.findById(id);
  }

  async getFileByStorageKey(storageKey: string) {
    return this.filesRepository.findByStorageKey(storageKey);
  }
}
