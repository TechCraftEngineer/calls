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
      isPublic?: boolean;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{
    id: string;
    s3Key: string;
    s3Url?: string;
    filename: string;
    sizeBytes: number;
  }> {
    // Генерируем уникальный S3 ключ
    const s3Key = generateS3Key(
      `${fileData.fileType}/${fileData.originalName}`,
    );

    // Загружаем в S3
    const uploadResult = await uploadBufferToS3(
      s3Key,
      fileData.buffer,
      fileData.mimeType,
    );

    // Создаем запись в БД
    const fileRecord = await this.filesRepository.create({
      workspaceId,
      filename: uploadResult.key,
      originalName: fileData.originalName,
      mimeType: fileData.mimeType,
      sizeBytes: fileData.buffer.length,
      fileType: fileData.fileType,
      s3Key: uploadResult.key,
      s3Bucket: uploadResult.bucket,
      isPublic: fileData.isPublic ?? false,
      metadata: fileData.metadata ? JSON.stringify(fileData.metadata) : null,
    });

    // Логируем создание файла
    await this.systemRepository.addActivityLog(
      "INFO",
      `File uploaded: ${fileData.originalName} (${fileData.fileType})`,
      "system",
    );

    return {
      id: fileRecord.id,
      s3Key: fileRecord.s3Key,
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
    s3Key: string;
    filename: string;
    sizeBytes: number;
  }> {
    return this.uploadFile(workspaceId, {
      originalName,
      buffer,
      mimeType: "audio/mpeg",
      fileType: "call_recording",
      isPublic: false,
    });
  }

  async getFileDownloadUrl(s3Key: string): Promise<string> {
    const file = await this.filesRepository.findByS3Key(s3Key);
    if (!file) {
      throw new Error(`File not found: ${s3Key}`);
    }

    // Если файл публичный, можно вернуть прямой URL
    if (file.isPublic && file.s3Url) {
      return file.s3Url;
    }

    // Иначе генерируем presigned URL
    return getDownloadUrl(s3Key);
  }

  async getFilesByWorkspace(workspaceId: string, fileType?: FileType) {
    return this.filesRepository.findByWorkspaceId({
      workspaceId,
      fileType,
    });
  }

  async deleteFile(s3Key: string): Promise<boolean> {
    const file = await this.filesRepository.deleteByS3Key(s3Key);

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

  async getFileByS3Key(s3Key: string) {
    return this.filesRepository.findByS3Key(s3Key);
  }
}
