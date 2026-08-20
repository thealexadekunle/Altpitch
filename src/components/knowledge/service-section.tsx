"use client";

import { useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { upsertService } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { NichePicker } from "@/components/knowledge/niche-picker";
import { nicheLabel } from "@/lib/utils";
import type { Niche, ServiceOffering } from "@/lib/types";

const empty = { name: "", description: "", niches: [] as Niche[], typicalPrice: "" };

export function ServiceSection({ items, onChanged }: { items: ServiceOffering[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceOffering | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(item: ServiceOffering) {
    setEditing(item);
    setForm({ name: item.name, description: item.description, niches: item.niches, typicalPrice: item.typicalPrice });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      await upsertService({ ...form, id: editing?.id });
      toast.success(editing ? "Service updated." : "Service added.");
      setOpen(false);
      onChanged();
    } catch {
      toast.error("Couldn't save service.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus /> Add service
        </Button>
      </div>

      {items.length === 0 && (
        <EmptyState
          icon={Wrench}
          title="No services yet"
          description="Define what you offer by niche so proposals frame the right scope."
          action={<Button size="sm" onClick={openCreate}>Add service</Button>}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id} className="cursor-pointer transition-colors hover:bg-card/80" onClick={() => openEdit(item)}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <span className="text-xs text-muted-foreground">{item.typicalPrice}</span>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
              <div className="flex flex-wrap gap-1">
                {item.niches.map((n) => (
                  <Badge key={n} variant="muted">{nicheLabel(n)}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit service" : "Add service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="service-name">Name</Label>
              <Input id="service-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-description">Description</Label>
              <Textarea id="service-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label id="service-niches-label">Niches</Label>
              <NichePicker value={form.niches} onChange={(v) => setForm({ ...form, niches: v })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-price">Typical price</Label>
              <Input id="service-price" value={form.typicalPrice} onChange={(e) => setForm({ ...form, typicalPrice: e.target.value })} placeholder="e.g. $2,000–5,000" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
