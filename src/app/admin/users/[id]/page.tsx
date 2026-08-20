"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Eye, KeyRound, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminUserDetail {
  id: string;
  email: string;
  createdAt: string;
  profile: {
    role: "user" | "admin" | "owner";
    suspended: boolean;
    suspendedReason: string | null;
    name: string;
    deletionScheduledFor: string | null;
  } | null;
  credits: { used: number; granted: number } | null;
  subscription: { plan: string; status: string } | null;
  jobCount: number;
}

interface ImpersonatedJob {
  id: string;
  status: string;
  createdAt: string;
  parsed: { title?: string } | null;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [impersonating, setImpersonating] = useState(false);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [reason, setReason] = useState("");
  const [creditsToGrant, setCreditsToGrant] = useState("3");
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState<ImpersonatedJob[] | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);

  function reload() {
    fetch(`/api/admin/users/${params.id}`)
      .then((r) => r.json())
      .then(setDetail);
  }

  useEffect(reload, [params.id]);

  async function handlePatch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Request failed.");
      }
      toast.success("Updated.");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImpersonate() {
    setImpersonating(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}/impersonate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Couldn't start impersonation.");
      }
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start impersonation.");
      setImpersonating(false);
    }
  }

  async function handleViewJobs() {
    setLoadingJobs(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}/jobs`);
      const body = await res.json();
      setJobs(body.jobs ?? []);
    } catch {
      toast.error("Couldn't load jobs.");
    } finally {
      setLoadingJobs(false);
    }
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  const suspended = detail.profile?.suspended ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <Link href="/admin/users" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          Back to users
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{detail.email}</h1>
          {detail.profile?.role && detail.profile.role !== "user" && <Badge variant="accent">{detail.profile.role}</Badge>}
          {suspended && <Badge variant="destructive">suspended</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          Joined {new Date(detail.createdAt).toLocaleDateString()} · {detail.jobCount} jobs analyzed
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan &amp; credits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Plan: <span className="text-foreground">{detail.subscription?.plan ?? "trial"}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Trial credits: <span className="text-foreground">{detail.credits ? `${detail.credits.used}/${detail.credits.granted} used` : "not initialized"}</span>
          </p>
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="grant-credits">Grant additional credits</Label>
              <Input id="grant-credits" type="number" min={1} value={creditsToGrant} onChange={(e) => setCreditsToGrant(e.target.value)} className="w-32" />
            </div>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => handlePatch({ grantCredits: Number(creditsToGrant) })}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              Grant
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!suspended ? (
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Suspension reason (visible in audit log)</Label>
              <Input id="suspend-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. abuse of trial credits" />
              <Button variant="destructive" disabled={busy} onClick={() => handlePatch({ suspended: true, suspendedReason: reason || null })}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                Suspend account
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {detail.profile?.suspendedReason && (
                <p className="text-sm text-muted-foreground">Reason: {detail.profile.suspendedReason}</p>
              )}
              <Button variant="outline" disabled={busy} onClick={() => handlePatch({ suspended: false })}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                Unsuspend account
              </Button>
            </div>
          )}

          <div className="border-t border-border pt-3">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => handlePatch({ forcePasswordReset: true })}>
              {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}
              Force password reset
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Signs them out everywhere immediately and emails a reset link. They can&apos;t sign back in with their old password.
            </p>
          </div>

          <div className="border-t border-border pt-3">
            {detail.profile?.deletionScheduledFor ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  Scheduled for permanent deletion on {new Date(detail.profile.deletionScheduledFor).toLocaleDateString()}.
                </p>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => handlePatch({ scheduleDeletion: "cancel" })}>
                  {busy ? <Loader2 className="animate-spin" /> : null}
                  Cancel deletion
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Button variant="destructive" size="sm" disabled={busy} onClick={() => handlePatch({ scheduleDeletion: "schedule" })}>
                  {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  Schedule deletion (7-day window)
                </Button>
                <p className="text-xs text-muted-foreground">
                  Suspends the account immediately. Data is only permanently deleted after 7 days — cancelable any time before then.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Read-only view
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Browse the real app as this user for up to 30 minutes — read-only, bannered on every page, and any write
            attempt lands on your own admin account, not theirs. Every start/stop is audit-logged.
          </p>
          <Button variant="outline" size="sm" disabled={impersonating} onClick={handleImpersonate}>
            {impersonating ? <Loader2 className="animate-spin" /> : <Eye />}
            Impersonate (read-only)
          </Button>

          <p className="pt-2 text-xs text-muted-foreground">Or just list their job posts here, no navigation:</p>
          {jobs === null && (
            <Button variant="outline" onClick={handleViewJobs} disabled={loadingJobs}>
              {loadingJobs ? <Loader2 className="animate-spin" /> : <Eye />}
              Load jobs (read-only)
            </Button>
          )}
          {jobs !== null && jobs.length === 0 && <p className="text-sm text-muted-foreground">No jobs analyzed yet.</p>}
          {jobs !== null && jobs.length > 0 && (
            <div className="divide-y divide-border rounded-md border border-border">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="truncate text-foreground">{job.parsed?.title ?? "Untitled job"}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="muted">{job.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
