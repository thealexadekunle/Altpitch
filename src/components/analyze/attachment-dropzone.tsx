"use client";

import { useCallback, useId, useRef, useState } from "react";
import { FileText, FileImage, File as FileIcon, Loader2, Upload, X } from "lucide-react";
import { uploadAttachment, deleteAttachment, ACCEPTED_MIME_TYPES, MAX_ATTACHMENTS, MAX_ATTACHMENT_SIZE } from "@/lib/data";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AttachmentMeta } from "@/lib/types";

const KIND_ICON = { pdf: FileText, docx: FileText, image: FileImage, text: FileIcon } as const;

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface AttachmentDropzoneProps {
  jobId: string | null;
  attachmentIds: string[];
  onAttachmentIdsChange: (ids: string[]) => void;
}

/** Drag-and-drop or browse. Rejections render inline (not a toast) per spec — the user needs to
 * see exactly which file failed and why while they're still looking at the drop target. */
export function AttachmentDropzone({ jobId, attachmentIds, onAttachmentIdsChange }: AttachmentDropzoneProps) {
  const [files, setFiles] = useState<AttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setError(null);

      const incoming = Array.from(fileList);
      if (files.length + incoming.length > MAX_ATTACHMENTS) {
        setError(`Max ${MAX_ATTACHMENTS} files — you have ${files.length}, tried to add ${incoming.length}.`);
        return;
      }

      setUploading(true);
      const uploaded: AttachmentMeta[] = [];
      for (const file of incoming) {
        if (!(file.type in ACCEPTED_MIME_TYPES)) {
          setError(`${file.name}: unsupported type. Accepted: PDF, DOCX, PNG, JPG, TXT.`);
          continue;
        }
        if (file.size > MAX_ATTACHMENT_SIZE) {
          setError(`${file.name}: exceeds the 10MB limit.`);
          continue;
        }
        try {
          const meta = await uploadAttachment(file, jobId);
          uploaded.push(meta);
        } catch (err) {
          setError(err instanceof Error ? err.message : `${file.name}: upload failed.`);
        }
      }
      setUploading(false);
      if (uploaded.length > 0) {
        const next = [...files, ...uploaded];
        setFiles(next);
        onAttachmentIdsChange(next.map((f) => f.id));
      }
    },
    [files, jobId, onAttachmentIdsChange]
  );

  async function handleRemove(id: string) {
    try {
      await deleteAttachment(id);
    } catch {
      // still remove locally — file may already be gone
    }
    const next = files.filter((f) => f.id !== id);
    setFiles(next);
    onAttachmentIdsChange(next.map((f) => f.id));
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Attachments</Label>
      <p className="text-xs text-muted-foreground">
        Briefs, mockups, or spec files the client referenced. PDF, DOCX, PNG, JPG, TXT — max {MAX_ATTACHMENTS} files, 10MB each.
      </p>

      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          dragOver ? "border-accent bg-accent/5" : "border-border"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          Drag files here, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-accent underline-offset-2 hover:underline"
          >
            browse
          </button>
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={Object.keys(ACCEPTED_MIME_TYPES).join(",")}
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f) => {
            const Icon = KIND_ICON[f.kind];
            return (
              <li
                key={f.id}
                className="flex items-center gap-2 rounded-full border border-border bg-secondary/40 py-1 pl-2 pr-1 text-xs"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="max-w-40 truncate">{f.filename}</span>
                <span className="shrink-0 text-muted-foreground">{formatSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(f.id)}
                  className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-danger"
                  aria-label={`Remove ${f.filename}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {attachmentIds.length > 0 ? `${attachmentIds.length} file${attachmentIds.length === 1 ? "" : "s"} attached.` : ""}
      </div>
    </div>
  );
}
