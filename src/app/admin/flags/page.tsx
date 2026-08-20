"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

interface FeatureFlag {
  id: string;
  key: string;
  description: string;
  enabledGlobally: boolean;
}

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  function reload() {
    fetch("/api/admin/flags")
      .then((r) => r.json())
      .then((body) => setFlags(body.flags ?? []));
  }

  useEffect(reload, []);

  async function handleCreate() {
    if (!key.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim(), description }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Couldn't create flag.");
      }
      setKey("");
      setDescription("");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create flag.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(id: string, enabledGlobally: boolean) {
    setBusy(true);
    try {
      await fetch("/api/admin/flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabledGlobally }),
      });
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Feature flags</h1>
        <p className="text-sm text-muted-foreground">Global on/off switches, readable by any authenticated user.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New flag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="key (e.g. new-writer-model)" value={key} onChange={(e) => setKey(e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Button onClick={handleCreate} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Plus />}
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All flags</CardTitle>
        </CardHeader>
        <CardContent>
          {!flags && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}
          {flags && flags.length === 0 && <p className="text-sm text-muted-foreground">No flags yet.</p>}
          {flags && flags.length > 0 && (
            <div className="divide-y divide-border">
              {flags.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-foreground">{f.key}</p>
                    {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                  </div>
                  <Switch checked={f.enabledGlobally} onCheckedChange={(checked) => handleToggle(f.id, checked)} disabled={busy} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
