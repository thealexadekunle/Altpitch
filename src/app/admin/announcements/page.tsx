"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Announcement {
  id: string;
  message: string;
  level: "info" | "warning" | "critical";
  active: boolean;
  createdAt: string;
}

const LEVEL_VARIANT = { info: "outline", warning: "warning", critical: "destructive" } as const;

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<Announcement["level"]>("info");
  const [busy, setBusy] = useState(false);

  function reload() {
    fetch("/api/admin/announcements")
      .then((r) => r.json())
      .then((body) => setAnnouncements(body.announcements ?? []));
  }

  useEffect(reload, []);

  async function handleCreate() {
    if (!message.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), level }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Couldn't create announcement.");
      }
      setMessage("");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create announcement.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    setBusy(true);
    try {
      await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">Site-wide banners shown to every signed-in user.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
          <div className="flex gap-2">
            <Select value={level} onChange={(e) => setLevel(e.target.value as Announcement["level"])} className="w-40">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </Select>
            <Button onClick={handleCreate} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Plus />}
              Publish
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {!announcements && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}
          {announcements && announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
          {announcements && announcements.length > 0 && (
            <div className="divide-y divide-border">
              {announcements.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={LEVEL_VARIANT[a.level]}>{a.level}</Badge>
                      <span className="truncate text-sm text-foreground">{a.message}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                  <Switch checked={a.active} onCheckedChange={(checked) => handleToggle(a.id, checked)} disabled={busy} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
