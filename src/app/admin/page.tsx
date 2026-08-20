"use client";

import { useEffect, useState } from "react";
import { Users, Briefcase, CreditCard, Activity, DollarSign, TrendingUp, Gauge, AlertTriangle, Clock, Timer } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AuditLogRow {
  id: string;
  actorId: string | null;
  action: string;
  target: string | null;
  createdAt: string;
}

interface Overview {
  totalUsers: number;
  totalJobs: number;
  activeSubscribers: number;
  mrrUsd: number;
  topUpRevenue7dUsd: number;
  topUpRevenue30dUsd: number;
  trialToPaidConversion: number;
  analysesToday: number;
  analysesTodayP50Ms: number | null;
  errorRate24h: number;
  failedPaymentsInGrace: number;
  dunningGraceDays: number;
  overBudgetRuns24h: number;
  cronLastRunAt: string | null;
  cronHealthy: boolean;
  recentAuditLog: AuditLogRow[];
}

const usd = (n: number) => `$${n.toFixed(2)}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
  tone?: "warning" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md bg-secondary", tone === "destructive" && "bg-destructive/15", tone === "warning" && "bg-warning/15")}>
          <Icon className={cn("h-4 w-4 text-muted-foreground", tone === "destructive" && "text-danger", tone === "warning" && "text-warning")} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
        <StatCard icon={Users} label="Total users" value={data ? String(data.totalUsers) : "—"} />
        <StatCard icon={Briefcase} label="Total jobs analyzed" value={data ? String(data.totalJobs) : "—"} />
        <StatCard icon={CreditCard} label="Active subscribers" value={data ? String(data.activeSubscribers) : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={DollarSign} label="MRR" value={data ? usd(data.mrrUsd) : "—"} />
        <StatCard
          icon={DollarSign}
          label="Top-up revenue"
          value={data ? usd(data.topUpRevenue7dUsd) : "—"}
          hint={data ? `${usd(data.topUpRevenue30dUsd)} in 30d` : undefined}
        />
        <StatCard icon={TrendingUp} label="Trial-to-paid conversion" value={data ? pct(data.trialToPaidConversion) : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Activity}
          label="Analyses today"
          value={data ? String(data.analysesToday) : "—"}
          hint={data?.analysesTodayP50Ms != null ? `p50 ${(data.analysesTodayP50Ms / 1000).toFixed(1)}s` : undefined}
        />
        <StatCard
          icon={Gauge}
          label="Error rate (24h)"
          value={data ? pct(data.errorRate24h) : "—"}
          tone={data && data.errorRate24h > 0.05 ? "destructive" : undefined}
        />
        <StatCard
          icon={AlertTriangle}
          label="Over-budget runs (24h)"
          value={data ? String(data.overBudgetRuns24h) : "—"}
          tone={data && data.overBudgetRuns24h > 0 ? "warning" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={Timer}
          label="Failed payments in grace"
          value={data ? String(data.failedPaymentsInGrace) : "—"}
          hint={data ? `${data.dunningGraceDays}-day grace period` : undefined}
          tone={data && data.failedPaymentsInGrace > 0 ? "warning" : undefined}
        />
        <StatCard
          icon={Clock}
          label="Cron health"
          value={data ? (data.cronHealthy ? "Healthy" : "Stale") : "—"}
          hint={data?.cronLastRunAt ? `last ran ${new Date(data.cronLastRunAt).toLocaleString()}` : "never ran"}
          tone={data && !data.cronHealthy ? "destructive" : undefined}
        />
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
          {data && data.recentAuditLog.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
          {data && data.recentAuditLog.length > 0 && (
            <div className="space-y-1.5">
              {data.recentAuditLog.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0">
                  <span className="truncate font-mono text-xs text-foreground">{entry.action}</span>
                  {entry.target && <Badge variant="muted">{entry.target.slice(0, 8)}</Badge>}
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
