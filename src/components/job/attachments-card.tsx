import { FileText, FileImage, File as FileIcon, Paperclip } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import type { AttachmentMeta } from "@/lib/types";

const KIND_ICON = { pdf: FileText, docx: FileText, image: FileImage, text: FileIcon } as const;

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** Images preview inline, documents open in a new tab — matches how the client actually
 * referenced these files (a mockup you look at vs. a brief you read). */
export function AttachmentsCard({ attachments }: { attachments: AttachmentMeta[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attachments</CardTitle>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <EmptyState
            icon={Paperclip}
            title="No files attached"
            description="Briefs, mockups, or spec files the client referenced would show up here."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {attachments.map((a) => {
              const Icon = KIND_ICON[a.kind];
              return (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50"
                >
                  {a.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.filename} className="h-10 w-10 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-secondary">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{a.filename}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(a.size)}</p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
