import type { AttachmentMeta } from "@/lib/types";
import { throwForFailedResponse } from "@/lib/data/api-error";
import { ACCEPTED_MIME_TYPES, MAX_ATTACHMENTS, MAX_ATTACHMENT_SIZE } from "@/lib/attachments-shared";

export { ACCEPTED_MIME_TYPES, MAX_ATTACHMENTS, MAX_ATTACHMENT_SIZE };

/**
 * Uploads go through /api/upload-attachment (Corrections 02) — real magic-byte validation
 * against the file's actual bytes and EXIF stripped from images by re-encoding, both done
 * server-side where a client can't route around them. Uploads before analysis (jobId null) land
 * under `${userId}/pending/`; /api/analyze links them to the real job once it exists. Storage
 * backend is R2 (see lib/r2.ts) as of the Neon migration — same convention, different bucket.
 */
export async function uploadAttachment(file: File, jobId: string | null): Promise<AttachmentMeta> {
  const formData = new FormData();
  formData.append("file", file);
  if (jobId) formData.append("jobId", jobId);

  const res = await fetch("/api/upload-attachment", { method: "POST", body: formData });
  if (!res.ok) {
    await throwForFailedResponse(res, "Upload failed.");
  }
  return res.json();
}

export async function getAttachments(jobId: string): Promise<AttachmentMeta[]> {
  const res = await fetch(`/api/attachments?jobId=${jobId}`);
  if (!res.ok) await throwForFailedResponse(res, "Couldn't load attachments.");
  const { attachments } = (await res.json()) as { attachments: AttachmentMeta[] };
  return attachments;
}

/** Attachments uploaded before analysis, not yet linked to a job (still under `pending/`). */
export async function getPendingAttachments(ids: string[]): Promise<AttachmentMeta[]> {
  if (ids.length === 0) return [];
  const res = await fetch(`/api/attachments?ids=${ids.join(",")}`);
  if (!res.ok) await throwForFailedResponse(res, "Couldn't load pending attachments.");
  const { attachments } = (await res.json()) as { attachments: AttachmentMeta[] };
  return attachments;
}

export async function deleteAttachment(id: string): Promise<void> {
  const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
  if (!res.ok) await throwForFailedResponse(res, "Couldn't delete attachment.");
}
