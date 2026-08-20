import Link from "next/link";
import {
  ScanSearch,
  FileEdit,
  Send,
  MessageSquare,
  CalendarCheck,
  BookOpen,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { ActivityItem } from "@/lib/types";

const ICONS: Record<ActivityItem["type"], typeof ScanSearch> = {
  analyzed: ScanSearch,
  proposal_drafted: FileEdit,
  proposal_sent: Send,
  reply: MessageSquare,
  interview: CalendarCheck,
  knowledge_added: BookOpen,
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        const content = (
          <div className="flex gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary/50">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.description}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(item.timestamp)}
            </span>
          </div>
        );
        return (
          <li key={item.id}>
            {item.jobId ? <Link href={`/jobs/${item.jobId}`}>{content}</Link> : content}
          </li>
        );
      })}
    </ul>
  );
}
