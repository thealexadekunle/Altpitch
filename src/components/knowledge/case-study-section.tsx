"use client";

import { useState } from "react";
import { Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { upsertCaseStudy } from "@/lib/data";
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
import type { CaseStudy, Niche } from "@/lib/types";

const empty = { title: "", niche: "web-design" as Niche, challenge: "", approach: "", result: "", metrics: "" };

export function CaseStudySection({ items, onChanged }: { items: CaseStudy[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaseStudy | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(item: CaseStudy) {
    setEditing(item);
    setForm({
      title: item.title,
      niche: item.niche,
      challenge: item.challenge,
      approach: item.approach,
      result: item.result,
      metrics: item.metrics.join(", "),
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
      await upsertCaseStudy({
        title: form.title,
        niche: form.niche,
        challenge: form.challenge,
        approach: form.approach,
        result: form.result,
        metrics: form.metrics.split(",").map((m) => m.trim()).filter(Boolean),
        id: editing?.id,
      });
      toast.success(editing ? "Case study updated." : "Case study added.");
      setOpen(false);
      onChanged();
    } catch {
      toast.error("Couldn't save case study.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus /> Add case study
        </Button>
      </div>

      {items.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No case studies yet"
          description="Case studies give the Writer a full challenge-to-result arc to draw proof from."
          action={<Button size="sm" onClick={openCreate}>Add case study</Button>}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id} className="cursor-pointer transition-colors hover:bg-card/80" onClick={() => openEdit(item)}>
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <Badge variant="muted">{nicheLabel(item.niche)}</Badge>
              <p className="line-clamp-2 text-xs text-muted-foreground">{item.result}</p>
              <div className="flex flex-wrap gap-1">
                {item.metrics.map((m) => (
                  <Badge key={m} variant="accent">{m}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit case study" : "Add case study"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="case-title">Title</Label>
              <Input id="case-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label id="case-niche-label">Niche</Label>
              <NichePicker multi={false} value={[form.niche]} onChange={(v) => setForm({ ...form, niche: v[0] })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-challenge">Challenge</Label>
              <Textarea id="case-challenge" value={form.challenge} onChange={(e) => setForm({ ...form, challenge: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-approach">Approach</Label>
              <Textarea id="case-approach" value={form.approach} onChange={(e) => setForm({ ...form, approach: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-result">Result</Label>
              <Textarea id="case-result" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-metrics">Metrics (comma separated)</Label>
              <Input id="case-metrics" value={form.metrics} onChange={(e) => setForm({ ...form, metrics: e.target.value })} />
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
