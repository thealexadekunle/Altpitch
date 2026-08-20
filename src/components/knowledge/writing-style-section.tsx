"use client";

import { useState } from "react";
import { Plus, PenLine } from "lucide-react";
import { toast } from "sonner";
import { upsertWritingStyle } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import type { WritingStyleEntry } from "@/lib/types";

const empty = { name: "", sample: "", notes: "" };

export function WritingStyleSection({ items, onChanged }: { items: WritingStyleEntry[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WritingStyleEntry | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(item: WritingStyleEntry) {
    setEditing(item);
    setForm({ name: item.name, sample: item.sample, notes: item.notes });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      await upsertWritingStyle({ ...form, id: editing?.id });
      toast.success(editing ? "Style sample updated." : "Style sample added.");
      setOpen(false);
      onChanged();
    } catch {
      toast.error("Couldn't save style sample.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus /> Add style sample
        </Button>
      </div>

      {items.length === 0 && (
        <EmptyState
          icon={PenLine}
          title="No writing style samples yet"
          description="Add examples of how you write so proposals sound like you, not a template."
          action={<Button size="sm" onClick={openCreate}>Add style sample</Button>}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id} className="cursor-pointer transition-colors hover:bg-card/80" onClick={() => openEdit(item)}>
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-medium text-foreground">{item.name}</p>
              <p className="line-clamp-3 text-xs italic text-muted-foreground">{item.sample}</p>
              {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit style sample" : "Add style sample"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="style-name">Name</Label>
              <Input id="style-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Default opening tone" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="style-sample">Sample</Label>
              <Textarea id="style-sample" value={form.sample} onChange={(e) => setForm({ ...form, sample: e.target.value })} className="min-h-24" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="style-notes">Notes</Label>
              <Textarea id="style-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
