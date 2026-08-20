"use client";

import { useState } from "react";
import { Plus, Trash2, ExternalLink, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { upsertPortfolioItem, deletePortfolioItem } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { NichePicker } from "@/components/knowledge/niche-picker";
import { nicheLabel } from "@/lib/utils";
import type { Niche, PortfolioItem } from "@/lib/types";

const empty = { title: "", nicheTags: [] as Niche[], outcomeMetric: "", link: "", description: "" };

export function PortfolioSection({ items, onChanged }: { items: PortfolioItem[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(item: PortfolioItem) {
    setEditing(item);
    setForm({
      title: item.title,
      nicheTags: item.nicheTags,
      outcomeMetric: item.outcomeMetric,
      link: item.link ?? "",
      description: item.description,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      await upsertPortfolioItem({ ...form, id: editing?.id });
      toast.success(editing ? "Portfolio item updated." : "Portfolio item added.");
      setOpen(false);
      onChanged();
    } catch {
      toast.error("Couldn't save item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePortfolioItem(id);
      toast.success("Portfolio item removed.");
      onChanged();
    } catch {
      toast.error("Couldn't remove item.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus /> Add portfolio item
        </Button>
      </div>

      {items.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="No portfolio items yet"
          description="Add your strongest work by niche — the Writer only cites proof you've added here, never invented experience."
          action={<Button size="sm" onClick={openCreate}>Add portfolio item</Button>}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id} className="cursor-pointer transition-colors hover:bg-card/80" onClick={() => openEdit(item)}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="shrink-0 text-muted-foreground hover:text-danger"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{item.outcomeMetric}</p>
              <div className="flex flex-wrap gap-1">
                {item.nicheTags.map((t) => (
                  <Badge key={t} variant="muted">{nicheLabel(t)}</Badge>
                ))}
              </div>
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> View
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit portfolio item" : "Add portfolio item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="portfolio-title">Title</Label>
              <Input id="portfolio-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label id="portfolio-niche-label">Niche tags</Label>
              <NichePicker value={form.nicheTags} onChange={(v) => setForm({ ...form, nicheTags: v })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portfolio-outcome">Outcome metric</Label>
              <Input
                id="portfolio-outcome"
                value={form.outcomeMetric}
                onChange={(e) => setForm({ ...form, outcomeMetric: e.target.value })}
                placeholder="e.g. +34% conversion in 6 weeks"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portfolio-link">Link (optional)</Label>
              <Input id="portfolio-link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portfolio-description">Description</Label>
              <Textarea id="portfolio-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
