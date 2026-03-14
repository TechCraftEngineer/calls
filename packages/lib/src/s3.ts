import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@calls/config";

let s3Client: S3Client | null = null;
let bucketName: string | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const accessKeyId = env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "AWS credentials (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY) are required",
      );
    }
    const s3Endpoint = env.AWS_S3_ENDPOINT;
    const s3ForcePathStyle = env.AWS_S3_FORCE_PATH_STYLE !== "false";
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: { accessKeyId, secretAccessKey },
      ...(s3Endpoint
        ? {
            endpoint: s3Endpoint,
            forcePathStyle: s3ForcePathStyle,
          }
        : {}),
    });
    bucketName = env.AWS_S3_BUCKET;
  }
  return s3Client;
}

function getBucketName(): string {
  getS3Client();
  const name = bucketName;
  if (!name) throw new Error("AWS_S3_BUCKET is required");
  return name;
}

export async function createPresignedUrl(key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: "application/octet-stream",
  });

  return getSignedUrl(getS3Client(), command, { expiresIn: 3600 }); // 1 hour
}

export function generateS3Key(originalKey: string, temporary = false): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const prefix = temporary ? "temp" : "uploads";

  return `${prefix}/${timestamp}-${randomId}-${originalKey}`;
}

export async function uploadBufferToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType?: string,
): Promise<{ key: string; bucket: string; etag?: string }> {
  const bucket = getBucketName();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType ?? "application/octet-stream",
  });
  try {
    const res = await getS3Client().send(command);
    return { key, bucket, etag: res.ETag };
  } catch (err) {
    const e = err as Error;
    console.error("S3 upload failed", {
      bucket: getBucketName(),
      key,
      error: e?.message ?? String(err),
      stack: e?.stack,
    });
    throw new Error(
      `Failed to upload to S3 bucket '${getBucketName()}' key '${key}': ${e?.message ?? String(err)}`,
    );
  }
}

export async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn: 3600 }); // 1 hour
}
