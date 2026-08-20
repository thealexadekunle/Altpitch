import type { AttachmentKind } from "@/lib/types";

/** Shared between the client service and the server upload route — no server-only import here
 * so either side can pull it in without pulling in the wrong client. */
export const ACCEPTED_MIME_TYPES: Record<string, AttachmentKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "image",
  "image/jpeg": "image",
  "text/plain": "text",
};

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
