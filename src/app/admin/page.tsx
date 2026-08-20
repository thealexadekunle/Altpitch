"use client";

import { useEffect, useState } from "react";
import { Users, Briefcase, CreditCard, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLogRow {
  id: string;
  actorId: string | null;
  action: string;
  target: string | null;
  createdAt: string;
}

interface Overview {
  totalUsers: number | null;
  totalJobs: number | null;
  activeSubscriptions: number | null;
  recentAuditLog: AuditLogRow[];
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | null }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-semibold tabular-nums">{value ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Operational snapshot.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Total users" value={data?.totalUsers ?? null} />
        <StatCard icon={Briefcase} label="Total jobs analyzed" value={data?.totalJobs ?? null} />
        <StatCard icon={CreditCard} label="Active subscriptions" value={data?.activeSubscriptions ?? null} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent audit log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          )}
          {data && data.recentAuditLog.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No entries yet — this fills in once migration 0003 (audit_log) is applied and events start flowing.
            </p>
          )}
          {data && data.recentAuditLog.length > 0 && (
            <div className="space-y-1.5">
              {data.recentAuditLog.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
                  <span className="font-mono text-xs text-foreground">{entry.action}</span>
                  <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
