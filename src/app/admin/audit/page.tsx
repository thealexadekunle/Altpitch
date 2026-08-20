"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  target: string | null;
  metadata: unknown;
  ip: string | null;
  createdAt: string;
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actor, setActor] = useState("");
  const [target, setTarget] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (actor) params.set("actor", actor);
    if (target) params.set("target", target);
    if (action) params.set("action", action);
    if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
    if (dateTo) params.set("dateTo", new Date(dateTo).toISOString());
    params.set("page", String(page));
    return params.toString();
  }, [actor, target, action, dateFrom, dateTo, page]);

  useEffect(() => {
    const handle = setTimeout(() => {
      fetch(`/api/admin/audit?${queryString}`)
        .then((r) => r.json())
        .then((body) => {
          setEntries(body.entries ?? []);
          setTotal(body.total ?? 0);
        });
    }, 250);
    return () => clearTimeout(handle);
  }, [queryString]);

  useEffect(() => setPage(1), [actor, target, action, dateFrom, dateTo]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function downloadCsv() {
    const params = new URLSearchParams(queryString);
    params.set("csv", "true");
    window.open(`/api/admin/audit?${params.toString()}`, "_blank");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted-foreground">Append-only at the database level — every mutation, every action.</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadCsv}>
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Actor email…" value={actor} onChange={(e) => setActor(e.target.value)} className="w-52" />
        <Input placeholder="Target (user ID)…" value={target} onChange={(e) => setTarget(e.target.value)} className="w-52" />
        <Input placeholder="Action contains…" value={action} onChange={(e) => setAction(e.target.value)} className="w-52" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          From
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          To
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </label>
      </div>

      <Card>
        <CardContent className="p-0">
          {!entries && (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {entries && entries.length === 0 && <p className="p-5 text-sm text-muted-foreground">No matching audit entries.</p>}
          {entries && entries.length > 0 && (
            <>
              <div className="divide-y divide-border">
                {entries.map((e) => (
                  <div key={e.id} className="px-5 py-3 text-sm">
                    <button onClick={() => toggleExpanded(e.id)} className="flex w-full items-center justify-between gap-3 text-left">
                      <div className="flex min-w-0 items-center gap-2">
                        {expanded.has(e.id) ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        <span className="truncate font-mono text-xs text-foreground">{e.action}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{e.actorEmail ?? (e.actorId ? "deleted account" : "system")}</span>
                        {e.target && <span className="shrink-0 truncate font-mono text-xs text-muted-foreground">→ {e.target}</span>}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                    </button>
                    {expanded.has(e.id) && (
                      <pre className="mt-2 overflow-x-auto rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">
                        {JSON.stringify({ ip: e.ip, metadata: e.metadata }, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} · {total} total
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
