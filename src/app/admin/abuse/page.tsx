"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface BlockedDomain {
  domain: string;
  createdAt: string;
}

export default function AdminAbusePage() {
  const [domains, setDomains] = useState<BlockedDomain[] | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [busy, setBusy] = useState(false);

  function reload() {
    fetch("/api/admin/abuse/domains")
      .then((r) => r.json())
      .then((body) => setDomains(body.domains ?? []));
  }

  useEffect(reload, []);

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
    </div>
  );
}
