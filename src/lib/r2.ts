import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Attachment storage, on Cloudflare R2. S3-compatible, so this is the standard AWS SDK pointed
 * at Cloudflare's endpoint — zero egress fees, presigned URLs, "${userId}/..." key prefix. */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

let client: S3Client | null = null;
function r2Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

function bucketName(): string {
  return requireEnv("R2_BUCKET_NAME");
}

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2Client().send(new PutObjectCommand({ Bucket: bucketName(), Key: key, Body: body, ContentType: contentType }));
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const result = await r2Client().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error(`R2 object not found or empty: ${key}`);
  return Buffer.from(bytes);
}

/** Used by /api/health — a HeadBucket call is the cheapest real reachability check (no object
 * read/write, just confirms the bucket exists and credentials are valid). */
export async function checkR2Reachable(): Promise<boolean> {
  try {
    await r2Client().send(new HeadBucketCommand({ Bucket: bucketName() }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}

/** 1-hour signed download URL. */
// AUDIT_REPORT.md F5-1 — was 3600 (1hr), spec wants signed URLs valid for ≤10min.
export async function getSignedDownloadUrl(key: string, expiresInSeconds = 600): Promise<string> {
  return getSignedUrl(r2Client(), new GetObjectCommand({ Bucket: bucketName(), Key: key }), { expiresIn: expiresInSeconds });
}

export function mimeToAttachmentKind(mime: string): "pdf" | "docx" | "image" | "text" {
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (mime === "image/png" || mime === "image/jpeg") return "image";
  return "text";
}

interface AttachmentRowLike {
  id: string;
  jobId: string | null;
  filename: string;
  mime: string;
  size: number;
  storagePath: string;
  createdAt: Date;
}

/** Shapes a raw attachments row (any of the DB's camelCase columns) into the AttachmentMeta the
 * frontend expects — same job every route touching attachments needs, so it lives here once. */
export async function toAttachmentMeta(row: AttachmentRowLike) {
  return {
    id: row.id,
    jobId: row.jobId ?? "",
    filename: row.filename,
    mime: row.mime,
    size: row.size,
    url: await getSignedDownloadUrl(row.storagePath).catch(() => ""),
    kind: mimeToAttachmentKind(row.mime),
    createdAt: row.createdAt.toString(),
  };
}
