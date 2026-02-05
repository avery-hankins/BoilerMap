import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 Configuration for LocalStack
const s3Config = {
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT || "http://localhost:4566",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  },
  forcePathStyle: true, // Required for LocalStack
};

export const s3Client = new S3Client(s3Config);

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || "boilermap-images";

// Upload file to S3
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return the S3 URL (LocalStack format)
  const endpoint = process.env.S3_ENDPOINT || "http://localhost:4566";
  return `${endpoint}/${BUCKET_NAME}/${key}`;
}

// Get file from S3
export async function getFromS3(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error("No body in S3 response");
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Delete file from S3
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

// Get a presigned URL for direct access (optional)
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Generate S3 key for user profile photos
export function getUserProfilePhotoKey(userId: number): string {
  return `users/${userId}/profile.jpg`;
}

// Generate S3 key for event images
export function getEventImageKey(eventId: number, filename: string): string {
  return `events/${eventId}/${filename}`;
}

// Check if S3 is available (useful for health checks)
export async function checkS3Connection(): Promise<boolean> {
  try {
    const { ListBucketsCommand } = await import("@aws-sdk/client-s3");
    const command = new ListBucketsCommand({});
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error("S3 connection check failed:", error);
    return false;
  }
}
