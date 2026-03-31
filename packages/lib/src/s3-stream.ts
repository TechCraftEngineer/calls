/**
 * S3 streaming utilities for direct FTP to S3 upload
 */

import type { Readable } from "node:stream";
import { PutObjectCommand, type PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { env } from "@calls/config";
import type { FileType } from "@calls/db";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const accessKey = env.AWS_ACCESS_KEY_ID;
    const secretKey = env.AWS_SECRET_ACCESS_KEY;
    if (!accessKey || !secretKey)
      throw new Error("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required");
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      ...(env.AWS_S3_ENDPOINT
        ? {
            endpoint: env.AWS_S3_ENDPOINT,
            forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE !== "false",
          }
        : {}),
    });
  }
  return s3Client;
}

export async function uploadStreamToS3(
  key: string,
  stream: Readable,
  contentType: string,
  contentLength?: number,
): Promise<{ key: string; bucket: string; etag?: string }> {
  const bucket = env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET is required");
  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: stream,
    ContentType: contentType,
  };

  if (contentLength) {
    params.ContentLength = contentLength;
  }

  const command = new PutObjectCommand(params);
  const result = await getS3Client().send(command);

  return {
    key,
    bucket,
    etag: result.ETag,
  };
}

export function generateS3KeyForFileType(originalKey: string, fileType: FileType): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const prefix = fileType === "call_recording" ? "recordings" : "uploads";

  return `${prefix}/${timestamp}-${randomId}-${originalKey}`;
}
