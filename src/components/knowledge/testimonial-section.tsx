"use client";

import { useState } from "react";
import { Plus, Star, MessageSquareQuote } from "lucide-react";
import { toast } from "sonner";
import { upsertTestimonial } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { NichePicker } from "@/components/knowledge/niche-picker";
import { cn, nicheLabel } from "@/lib/utils";
import type { Niche, Testimonial } from "@/lib/types";

const empty = { clientName: "", clientRole: "", quote: "", niche: "web-design" as Niche, rating: 5 };

export function TestimonialSection({ items, onChanged }: { items: Testimonial[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(item: Testimonial) {
    setEditing(item);
    setForm({ clientName: item.clientName, clientRole: item.clientRole, quote: item.quote, niche: item.niche, rating: item.rating });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.clientName.trim() || !form.quote.trim()) {
      toast.error("Client name and quote are required.");
      return;
    }
    setSaving(true);
    try {
      await upsertTestimonial({ ...form, id: editing?.id });
      toast.success(editing ? "Testimonial updated." : "Testimonial added.");
      setOpen(false);
      onChanged();
    } catch {
      toast.error("Couldn't save testimonial.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus /> Add testimonial
        </Button>
      </div>

      {items.length === 0 && (
        <EmptyState
          icon={MessageSquareQuote}
          title="No testimonials yet"
          description="Client quotes build trust in proposals — add a few to draw on."
          action={<Button size="sm" onClick={openCreate}>Add testimonial</Button>}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id} className="cursor-pointer transition-colors hover:bg-card/80" onClick={() => openEdit(item)}>
            <CardContent className="space-y-2 p-4">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("h-3.5 w-3.5", i < item.rating ? "fill-accent text-accent" : "text-muted-foreground")} />
                ))}
              </div>
              <p className="line-clamp-3 text-sm italic text-foreground">&ldquo;{item.quote}&rdquo;</p>
              <p className="text-xs text-muted-foreground">{item.clientName} · {item.clientRole}</p>
              <Badge variant="muted">{nicheLabel(item.niche)}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit testimonial" : "Add testimonial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="testimonial-name">Client name</Label>
                <Input id="testimonial-name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="testimonial-role">Client role</Label>
                <Input id="testimonial-role" value={form.clientRole} onChange={(e) => setForm({ ...form, clientRole: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="testimonial-quote">Quote</Label>
              <Textarea id="testimonial-quote" value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label id="testimonial-niche-label">Niche</Label>
              <NichePicker multi={false} value={[form.niche]} onChange={(v) => setForm({ ...form, niche: v[0] })} />
            </div>
            <div className="space-y-1.5">
              <Label id="testimonial-rating-label">Rating</Label>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} type="button" onClick={() => setForm({ ...form, rating: i + 1 })}>
                    <Star className={cn("h-5 w-5", i < form.rating ? "fill-accent text-accent" : "text-muted-foreground")} />
                  </button>
                ))}
              </div>
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
