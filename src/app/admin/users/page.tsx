"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Loader2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin" | "owner";
  suspended: boolean;
  suspendedReason: string | null;
  deletionScheduledFor: string | null;
  pipelineKillSwitch: boolean;
  createdAt: string;
  subscriptionStatus: string | null;
  creditsUsed: number;
  creditsGranted: number;
  creditsRemaining: number;
  lifetimeAnalyses: number;
  costUsd: number;
  paidUsd: number;
}

type BulkAction = "suspend" | "unsuspend" | "grant_credits" | "revoke_sessions" | "soft_delete";
const DESTRUCTIVE: BulkAction[] = ["suspend", "soft_delete"];
const MAX_TARGETS = 200;

interface BulkResult {
  userId: string;
  success: boolean;
  error?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [subscription, setSubscription] = useState("");
  const [overCost, setOverCost] = useState(false);
  const [sortBy, setSortBy] = useState("signupDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>("suspend");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkAmount, setBulkAmount] = useState("10");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTyped, setConfirmTyped] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [selectingAllMatching, setSelectingAllMatching] = useState(false);

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    if (subscription) params.set("subscription", subscription);
    if (overCost) params.set("overCost", "true");
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("page", String(page));
    return params.toString();
  }, [query, status, subscription, overCost, sortBy, sortDir, page]);

  function reload() {
    fetch(`/api/admin/users?${queryString}`)
      .then((r) => r.json())
      .then((body) => {
        setUsers(body.users ?? []);
        setTotal(body.total ?? 0);
      });
  }

  useEffect(() => {
    const handle = setTimeout(reload, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => setPage(1), [query, status, subscription, overCost, sortBy, sortDir]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    if (!users) return;
    setSelected((prev) => {
      const allSelected = users.every((u) => prev.has(u.id));
      const next = new Set(prev);
      for (const u of users) {
        if (allSelected) next.delete(u.id);
        else next.add(u.id);
      }
      return next;
    });
  }

  async function selectAllMatchingFilter() {
    setSelectingAllMatching(true);
    try {
      const ids = new Set<string>();
      let p = 1;
      while (ids.size < Math.min(total, MAX_TARGETS)) {
        const params = new URLSearchParams(queryString);
        params.set("page", String(p));
        const res = await fetch(`/api/admin/users?${params.toString()}`);
        const body = await res.json();
        const rows: AdminUserRow[] = body.users ?? [];
        if (rows.length === 0) break;
        for (const u of rows) {
          if (ids.size >= MAX_TARGETS) break;
          ids.add(u.id);
        }
        if (rows.length < pageSize) break;
        p++;
      }
      setSelected(ids);
      if (total > MAX_TARGETS) {
        toast.info(`Selected ${ids.size} of ${total} matching users — bulk actions cap at ${MAX_TARGETS}.`);
      }
    } finally {
      setSelectingAllMatching(false);
    }
  }

  function openConfirm() {
    if (selected.size === 0) return;
    if (bulkAction === "grant_credits" && bulkReason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters.");
      return;
    }
    setConfirmTyped("");
    setResults(null);
    setConfirmOpen(true);
  }

  async function runBulk() {
    const targetUserIds = Array.from(selected);
    const isDestructive = DESTRUCTIVE.includes(bulkAction);
    if (isDestructive && Number(confirmTyped) !== targetUserIds.length) {
      toast.error(`Type ${targetUserIds.length} to confirm.`);
      return;
    }
    setRunning(true);
    setProgress({ processed: 0, total: targetUserIds.length });
    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: bulkAction,
          targetUserIds,
          reason: bulkReason || undefined,
          amount: bulkAction === "grant_credits" ? Number(bulkAmount) : undefined,
          confirmCount: isDestructive ? targetUserIds.length : undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : "Bulk operation failed to start.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.stage === "progress") setProgress({ processed: event.processed, total: event.total });
          if (event.stage === "complete") setResults(event.results);
        }
      }
      toast.success("Bulk operation complete.");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk operation failed.");
    } finally {
      setRunning(false);
    }
  }

  function downloadResults() {
    if (!results) return;
    const csv = ["user_id,success,error", ...results.map((r) => `${r.userId},${r.success},"${(r.error ?? "").replace(/"/g, '""')}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-${bulkAction}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function closeConfirm() {
    if (running) return;
    setConfirmOpen(false);
    setResults(null);
    setProgress(null);
  }

  const allOnPageSelected = users !== null && users.length > 0 && users.every((u) => selected.has(u.id));

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Search, filter, inspect, act — one at a time or in bulk.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search email, name, or ID…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="soft_deleted">Soft-deleted</option>
          <option value="grace">Payment grace</option>
        </Select>
        <Select value={subscription} onChange={(e) => setSubscription(e.target.value)} className="w-40">
          <option value="">All plans</option>
          <option value="trialing">Trialing</option>
          <option value="subscribed">Subscribed</option>
          <option value="lapsed">Lapsed</option>
        </Select>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input type="checkbox" checked={overCost} onChange={(e) => setOverCost(e.target.checked)} className="h-3.5 w-3.5" />
          Over-cost only
        </label>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-40">
          <option value="signupDate">Sort: Signup date</option>
          <option value="email">Sort: Email</option>
          <option value="creditsRemaining">Sort: Credits remaining</option>
          <option value="lifetimeAnalyses">Sort: Lifetime analyses</option>
          <option value="costUsd">Sort: Cost (USD)</option>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
          {sortDir === "asc" ? "↑" : "↓"}
        </Button>
      </div>

      {selected.size > 0 && (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="flex flex-wrap items-center gap-2 p-3">
            <span className="text-sm text-foreground">{selected.size} selected</span>
            <Select value={bulkAction} onChange={(e) => setBulkAction(e.target.value as BulkAction)} className="w-44">
              <option value="suspend">Suspend</option>
              <option value="unsuspend">Unsuspend</option>
              <option value="grant_credits">Grant credits</option>
              <option value="revoke_sessions">Revoke sessions</option>
              <option value="soft_delete">Schedule deletion</option>
            </Select>
            {bulkAction === "grant_credits" && (
              <Input type="number" min={1} value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} className="w-24" placeholder="Amount" />
            )}
            <Input
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              placeholder={bulkAction === "grant_credits" ? "Reason (min 10 chars, required)" : "Reason (optional)"}
              className="w-64"
            />
            <Button size="sm" onClick={openConfirm}>
              Run
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {!users && (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {users && users.length === 0 && <p className="p-5 text-sm text-muted-foreground">No users found.</p>}
          {users && users.length > 0 && (
            <>
              <div className="flex items-center justify-between border-b border-border px-5 py-2 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} className="h-3.5 w-3.5" />
                  Select page ({users.length})
                </label>
                <button onClick={selectAllMatchingFilter} disabled={selectingAllMatching} className="flex items-center gap-1 hover:text-foreground">
                  {selectingAllMatching ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Select all {total} matching filter
                </button>
              </div>
              <div className="divide-y divide-border">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-secondary/40">
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleRow(u.id)} className="h-3.5 w-3.5 shrink-0" />
                    <Link href={`/admin/users/${u.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-foreground">{u.email}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.name || "No name set"} · {u.creditsRemaining} credits · {u.lifetimeAnalyses} analyses
                          {u.costUsd > u.paidUsd && <span className="text-warning"> · over-cost</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {u.role !== "user" && <Badge variant="accent">{u.role}</Badge>}
                        {u.pipelineKillSwitch && <Badge variant="warning">kill switch</Badge>}
                        {u.deletionScheduledFor && <Badge variant="destructive">deletion scheduled</Badge>}
                        {u.suspended && !u.deletionScheduledFor && <Badge variant="destructive">suspended</Badge>}
                        <span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                    </Link>
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

      <Dialog open={confirmOpen} onOpenChange={(open) => (open ? setConfirmOpen(true) : closeConfirm())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction.replace("_", " ")} {selected.size} user{selected.size === 1 ? "" : "s"}
            </DialogTitle>
            <DialogDescription>
              {DESTRUCTIVE.includes(bulkAction)
                ? `This is destructive. Type ${selected.size} below to confirm.`
                : "This will run immediately against every selected account."}
            </DialogDescription>
          </DialogHeader>

          {DESTRUCTIVE.includes(bulkAction) && !running && !results && (
            <Input
              value={confirmTyped}
              onChange={(e) => setConfirmTyped(e.target.value)}
              placeholder={`Type ${selected.size} to confirm`}
              autoFocus
            />
          )}

          {progress && (running || results) && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {progress.processed} / {progress.total} processed
              </p>
            </div>
          )}

          {results && (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-xs">
              {results.map((r) => (
                <div key={r.userId} className="flex items-center justify-between">
                  <span className="truncate font-mono text-muted-foreground">{r.userId}</span>
                  {r.success ? <Badge variant="default">ok</Badge> : <Badge variant="destructive">{r.error ?? "failed"}</Badge>}
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            {results && (
              <Button variant="outline" onClick={downloadResults}>
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </Button>
            )}
            {!results && (
              <Button disabled={running} onClick={runBulk}>
                {running ? <Loader2 className="animate-spin" /> : null}
                Confirm
              </Button>
            )}
            {results && <Button onClick={closeConfirm}>Done</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
