"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, ShieldOff, Power, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

interface BlockedDomain {
  domain: string;
  createdAt: string;
}

interface Violator {
  key: string;
  route: string;
  totalHits: number;
  userId: string | null;
  email: string | null;
}

export default function AdminAbusePage() {
  const [domains, setDomains] = useState<BlockedDomain[] | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [violators, setViolators] = useState<Violator[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [suspendingKey, setSuspendingKey] = useState<string | null>(null);
  const [killSwitchEmail, setKillSwitchEmail] = useState("");
  const [killSwitchTarget, setKillSwitchTarget] = useState<{ id: string; email: string; pipelineKillSwitch: boolean } | null>(null);
  const [searchingKillSwitch, setSearchingKillSwitch] = useState(false);
  const [togglingKillSwitch, setTogglingKillSwitch] = useState(false);

  function reload() {
    fetch("/api/admin/abuse/domains")
      .then((r) => r.json())
      .then((body) => setDomains(body.domains ?? []));
    fetch("/api/admin/abuse/violators")
      .then((r) => r.json())
      .then((body) => setViolators(body.violators ?? []));
  }

  useEffect(reload, []);

  async function handleSuspendViolator(v: Violator) {
    if (!v.userId) return;
    setSuspendingKey(v.key + v.route);
    try {
      const res = await fetch(`/api/admin/users/${v.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: true, suspendedReason: `Rate-limit abuse: ${v.totalHits} hits on ${v.route} in 7d` }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Couldn't suspend.");
      }
      toast.success(`Suspended ${v.email ?? v.userId}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't suspend.");
    } finally {
      setSuspendingKey(null);
    }
  }

  async function handleKillSwitchSearch() {
    if (!killSwitchEmail.trim()) return;
    setSearchingKillSwitch(true);
    setKillSwitchTarget(null);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(killSwitchEmail.trim())}`);
      const body = await res.json();
      const match = (body.users ?? []).find((u: { email: string }) => u.email.toLowerCase() === killSwitchEmail.trim().toLowerCase()) ?? body.users?.[0];
      if (!match) {
        toast.error("No user found with that email.");
        return;
      }
      setKillSwitchTarget({ id: match.id, email: match.email, pipelineKillSwitch: match.pipelineKillSwitch });
    } finally {
      setSearchingKillSwitch(false);
    }
  }

  async function handleToggleKillSwitch(checked: boolean) {
    if (!killSwitchTarget) return;
    setTogglingKillSwitch(true);
    try {
      const res = await fetch(`/api/admin/users/${killSwitchTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ killSwitch: checked }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Couldn't toggle kill switch.");
      }
      setKillSwitchTarget({ ...killSwitchTarget, pipelineKillSwitch: checked });
      toast.success(checked ? "Kill switch enabled." : "Kill switch disabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't toggle kill switch.");
    } finally {
      setTogglingKillSwitch(false);
    }
  }

  async function handleAdd() {
    if (!newDomain.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/abuse/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Couldn't block domain.");
      }
      setNewDomain("");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't block domain.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(domain: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/abuse/domains?domain=${encodeURIComponent(domain)}`, { method: "DELETE" });
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Abuse controls</h1>
        <p className="text-sm text-muted-foreground">
          Blocked email domains — sign-up is refused at the database level for any of these (see migration 0005).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blocked domains</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. tempmail.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Plus />}
              Block
            </Button>
          </div>

          {!domains && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          )}
          {domains && domains.length === 0 && <p className="text-sm text-muted-foreground">No domains blocked.</p>}
          {domains && domains.length > 0 && (
            <div className="divide-y divide-border rounded-md border border-border">
              {domains.map((d) => (
                <div key={d.domain} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-mono text-foreground">{d.domain}</span>
                  <button onClick={() => handleRemove(d.domain)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-4 w-4" />
            Per-user kill switch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="user@example.com"
              value={killSwitchEmail}
              onChange={(e) => setKillSwitchEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleKillSwitchSearch()}
            />
            <Button onClick={handleKillSwitchSearch} disabled={searchingKillSwitch}>
              {searchingKillSwitch ? <Loader2 className="animate-spin" /> : <Search />}
              Find
            </Button>
          </div>
          {killSwitchTarget && (
            <div className="flex items-center justify-between rounded-md border border-border px-4 py-2.5">
              <span className="text-sm text-foreground">{killSwitchTarget.email}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{togglingKillSwitch ? "updating…" : killSwitchTarget.pipelineKillSwitch ? "blocked" : "allowed"}</span>
                <Switch checked={killSwitchTarget.pipelineKillSwitch} disabled={togglingKillSwitch} onCheckedChange={handleToggleKillSwitch} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-4 w-4" />
            Rate-limit violators (last 7 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!violators && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          )}
          {violators && violators.length === 0 && <p className="text-sm text-muted-foreground">No violations in the last 7 days.</p>}
          {violators && violators.length > 0 && (
            <div className="divide-y divide-border rounded-md border border-border">
              {violators.map((v) => (
                <div key={v.key + v.route} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground">{v.email ?? v.key}</span>
                    <Badge variant="muted">{v.route}</Badge>
                    <span className="text-xs text-muted-foreground">{v.totalHits} hits</span>
                  </div>
                  {v.userId && (
                    <Button size="sm" variant="destructive" disabled={suspendingKey === v.key + v.route} onClick={() => handleSuspendViolator(v)}>
                      {suspendingKey === v.key + v.route ? <Loader2 className="animate-spin" /> : null}
                      Suspend
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
