"use client";

import { useState } from "react";
import { Plus, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { upsertFaq } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import type { FaqEntry } from "@/lib/types";

const empty = { question: "", answer: "", tags: "" };

export function FaqSection({ items, onChanged }: { items: FaqEntry[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FaqEntry | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(item: FaqEntry) {
    setEditing(item);
    setForm({ question: item.question, answer: item.answer, tags: item.tags.join(", ") });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.question.trim()) {
      toast.error("Question is required.");
      return;
    }
    setSaving(true);
    try {
      await upsertFaq({
        question: form.question,
        answer: form.answer,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        id: editing?.id,
      });
      toast.success(editing ? "FAQ updated." : "FAQ added.");
      setOpen(false);
      onChanged();
    } catch {
      toast.error("Couldn't save FAQ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus /> Add FAQ
        </Button>
      </div>

      {items.length === 0 && (
        <EmptyState
          icon={HelpCircle}
          title="No FAQs yet"
          description="Common answers feed screening question responses so nothing gets invented."
          action={<Button size="sm" onClick={openCreate}>Add FAQ</Button>}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id} className="cursor-pointer transition-colors hover:bg-card/80" onClick={() => openEdit(item)}>
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-medium text-foreground">{item.question}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{item.answer}</p>
              <div className="flex flex-wrap gap-1">
                {item.tags.map((t) => (
                  <Badge key={t} variant="muted">{t}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="faq-question">Question</Label>
              <Input id="faq-question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="faq-answer">Answer</Label>
              <Textarea id="faq-answer" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="faq-tags">Tags (comma separated)</Label>
              <Input id="faq-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
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
