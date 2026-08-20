"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Announcement {
  id: string;
  message: string;
  level: "info" | "warning" | "critical";
  link: string | null;
  dismissible: boolean;
  scheduledFor: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

const LEVEL_VARIANT = { info: "outline", warning: "warning", critical: "destructive" } as const;

export default function AdminBroadcastPage() {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<Announcement["level"]>("info");
  const [link, setLink] = useState("");
  const [dismissible, setDismissible] = useState(true);
  const [scheduledFor, setScheduledFor] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState<boolean | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pendingMaintenance, setPendingMaintenance] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  function reload() {
    fetch("/api/admin/announcements")
      .then((r) => r.json())
      .then((body) => setAnnouncements(body.announcements ?? []));
    fetch("/api/admin/broadcast/maintenance")
      .then((r) => r.json())
      .then((body) => setMaintenanceEnabled(body.enabled ?? false));
  }

  useEffect(reload, []);

  async function handleCreate() {
    if (!message.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          level,
          link: link.trim() || null,
          dismissible,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Couldn't create announcement.");
      }
      setMessage("");
      setLink("");
      setScheduledFor("");
      setExpiresAt("");
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

  function openMaintenanceConfirm(next: boolean) {
    setPendingMaintenance(next);
    setConfirmText("");
    setConfirmOpen(true);
  }

  async function confirmMaintenanceToggle() {
    setTogglingMaintenance(true);
    try {
      const res = await fetch("/api/admin/broadcast/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: pendingMaintenance, confirm: confirmText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Couldn't toggle maintenance mode.");
      }
      setMaintenanceEnabled(pendingMaintenance);
      setConfirmOpen(false);
      toast.success(pendingMaintenance ? "Maintenance mode enabled." : "Maintenance mode disabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't toggle maintenance mode.");
    } finally {
      setTogglingMaintenance(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Broadcast</h1>
        <p className="text-sm text-muted-foreground">Site-wide banners and maintenance mode.</p>
      </div>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Maintenance mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">{maintenanceEnabled ? "Enabled — non-admins see a full-page notice." : "Disabled — app is live for everyone."}</p>
              <p className="text-xs text-muted-foreground">Admins always retain access. Requires typed confirmation to change.</p>
            </div>
            {maintenanceEnabled === null ? (
              <Skeleton className="h-5 w-9" />
            ) : (
              <Switch checked={maintenanceEnabled} onCheckedChange={openMaintenanceConfirm} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
          <div className="flex gap-2">
            <Select value={level} onChange={(e) => setLevel(e.target.value as Announcement["level"])} className="w-32">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </Select>
            <Input placeholder="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} className="flex-1" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Start
              <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="w-44" />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Expires
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-44" />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={dismissible} onChange={(e) => setDismissible(e.target.checked)} className="h-3.5 w-3.5" />
              Dismissible
            </label>
          </div>
          <Button onClick={handleCreate} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Plus />}
            Publish
          </Button>
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
                      {!a.dismissible && <Badge variant="muted">sticky</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString()}
                      {a.scheduledFor && ` · starts ${new Date(a.scheduledFor).toLocaleString()}`}
                      {a.expiresAt && ` · expires ${new Date(a.expiresAt).toLocaleString()}`}
                    </p>
                  </div>
                  <Switch checked={a.active} onCheckedChange={(checked) => handleToggle(a.id, checked)} disabled={busy} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingMaintenance ? "Enable" : "Disable"} maintenance mode</DialogTitle>
            <DialogDescription>
              {pendingMaintenance
                ? "Every non-admin will see a full-page maintenance notice immediately."
                : "The app becomes reachable to everyone again immediately."}
              {" "}Type MAINTENANCE to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="MAINTENANCE" autoFocus />
          <DialogFooter>
            <Button variant="destructive" disabled={confirmText !== "MAINTENANCE" || togglingMaintenance} onClick={confirmMaintenanceToggle}>
              {togglingMaintenance ? <Loader2 className="animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
