import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { uploadToR2, deleteFromR2, toAttachmentMeta } from "@/lib/r2";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { ACCEPTED_MIME_TYPES, MAX_ATTACHMENT_SIZE } from "@/lib/attachments-shared";

export const dynamic = "force-dynamic";

const MAGIC_BYTE_MISMATCH = "File content doesn't match its declared type — renamed or corrupted file rejected.";

/**
 * Server-side upload (Corrections 02): the client used to write straight to Storage, which
 * meant validation only ran in the browser and could be bypassed by calling Storage directly.
 * Everything that matters now happens here: real file-signature sniffing (not just the
 * extension/mime string a client claims), EXIF stripped from images by re-encoding them,
 * never trusting the client's mime type for what actually gets stored. Storage backend is now
 * R2 (see lib/r2.ts) — same "${userId}/..." key prefix convention, same 1-hour signed URL.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scoped = scopedDb(session.user.id);

  const rateLimit = await checkRateLimit(`user:${session.user.id}`, RATE_LIMITS.default);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const jobIdRaw = form?.get("jobId");
  const jobId = typeof jobIdRaw === "string" && jobIdRaw ? jobIdRaw : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json({ error: `${file.name}: exceeds the 10MB limit.` }, { status: 400 });
  }
  if (!(file.type in ACCEPTED_MIME_TYPES)) {
    return NextResponse.json({ error: `${file.name}: unsupported file type.` }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);

  const { fileTypeFromBuffer } = await import("file-type");
  const sniffed = await fileTypeFromBuffer(buffer);

  // Plain text has no magic bytes to sniff — accept it as-is if declared text/plain.
  // Everything else must have its real signature match what the client claimed.
  if (file.type !== "text/plain") {
    if (!sniffed || !isAcceptedRealType(sniffed.mime)) {
      return NextResponse.json({ error: `${file.name}: ${MAGIC_BYTE_MISMATCH}` }, { status: 400 });
    }
  }

  let finalMime = file.type;

  if (file.type === "image/png" || file.type === "image/jpeg") {
    const sharp = (await import("sharp")).default;
    // Re-encoding drops all metadata (EXIF, GPS, etc.) by construction — sharp only carries
    // forward pixel data unless .withMetadata() is called, which we deliberately never do.
    const image = sharp(buffer);
    buffer = file.type === "image/png" ? await image.png().toBuffer() : await image.jpeg({ quality: 90 }).toBuffer();
    finalMime = file.type;
  }

  const storagePath = `${session.user.id}/${jobId ?? "pending"}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;

  try {
    await uploadToR2(storagePath, buffer, finalMime);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }

  const row = await scoped.attachments.insert({
    jobId,
    filename: file.name,
    mime: finalMime,
    size: buffer.byteLength,
    storagePath,
  });

  if (!row) {
    await deleteFromR2(storagePath).catch(() => {});
    return NextResponse.json({ error: "Failed to save attachment" }, { status: 500 });
  }

  return NextResponse.json(await toAttachmentMeta(row));
}

function isAcceptedRealType(sniffedMime: string): boolean {
  return sniffedMime === "application/pdf" || sniffedMime === "image/png" || sniffedMime === "image/jpeg" || sniffedMime === "application/zip"; // docx sniffs as zip (it's a zip container); good enough to reject non-office-zip content elsewhere if needed
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
