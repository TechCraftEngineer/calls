/**
 * S3 streaming utilities for direct FTP to S3 upload
 */

import {
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@calls/config";
import type { FileType } from "@calls/db";

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  },
  ...(env.AWS_S3_ENDPOINT
    ? {
        endpoint: env.AWS_S3_ENDPOINT,
        forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE !== "false",
      }
    : {}),
});

export async function uploadStreamToS3(
  key: string,
  stream: NodeJS.ReadableStream,
  contentType: string,
  contentLength?: number,
): Promise<{ key: string; bucket: string; etag?: string }> {
  const params: PutObjectCommandInput = {
    Bucket: env.AWS_S3_BUCKET!,
    Key: key,
    Body: stream,
    ContentType: contentType,
  };

  // Добавляем ContentLength если известно (для оптимизации)
  if (contentLength) {
    params.ContentLength = contentLength;
  }

  const command = new PutObjectCommand(params);
  const result = await s3Client.send(command);

  return {
    key,
    bucket: env.AWS_S3_BUCKET!,
    etag: result.ETag,
  };
}

export function generateS3Key(originalKey: string, fileType: FileType): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const prefix = fileType === "call_recording" ? "recordings" : "uploads";

  return `${prefix}/${timestamp}-${randomId}-${originalKey}`;
}
