import "server-only";
import { downloadFromR2 } from "@/lib/r2";
import { wrapUntrustedData } from "@/lib/ai/prompts/untrusted-data";
import type { attachments } from "@/lib/db/schema";

type AttachmentRow = typeof attachments.$inferSelect;

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ImageBlock {
  type: "image";
  source: { type: "base64"; media_type: "image/png" | "image/jpeg"; data: string };
}

export type AttachmentContentBlock = TextBlock | ImageBlock;

/**
 * Turns a job's attachments into Claude message content blocks — this is the real payoff of the
 * feature: the client's own brief, read directly by the Parser, so hidden requirements inside it
 * actually inform the verdict instead of sitting in a file nobody analyzed.
 */
export async function buildAttachmentContentBlocks(attachmentRows: AttachmentRow[]): Promise<AttachmentContentBlock[]> {
  const blocks: AttachmentContentBlock[] = [];

  for (const attachment of attachmentRows) {
    let buffer: Buffer;
    try {
      buffer = await downloadFromR2(attachment.storagePath);
    } catch {
      continue;
    }

    if (attachment.mime === "image/png" || attachment.mime === "image/jpeg") {
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: attachment.mime, data: buffer.toString("base64") },
      });
      continue;
    }

    const text = await extractText(attachment.mime, buffer);
    if (text.trim()) {
      blocks.push({
        type: "text",
        text: wrapUntrustedData(`attachment:${attachment.filename}`, text.trim()),
      });
    }
  }

  return blocks;
}

async function extractText(mime: string, buffer: Buffer): Promise<string> {
  if (mime === "text/plain") {
    return buffer.toString("utf-8");
  }
  if (mime === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  return "";
}
