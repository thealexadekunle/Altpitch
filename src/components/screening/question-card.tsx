"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, XCircle, Loader2, Scissors } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Rationale } from "@/components/rationale";
import { cn, scoreColorClass } from "@/lib/utils";
import { ANSWER_WORD_CEILING } from "@/lib/ai/writing-style";
import type { ScreeningQuestion } from "@/lib/types";

const CONSISTENCY_META = {
  consistent: { label: "Consistent", icon: CheckCircle2, className: "border-accent/40 bg-accent/15 text-accent" },
  review: { label: "Needs review", icon: AlertCircle, className: "border-warning/40 bg-warning/15 text-warning" },
  conflict: { label: "Conflict", icon: XCircle, className: "border-destructive/40 bg-destructive/15 text-danger" },
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function QuestionCard({
  question,
  onSubmitInfo,
  onTighten,
}: {
  question: ScreeningQuestion;
  onSubmitInfo: (questionId: string, info: string) => Promise<void>;
  onTighten: (questionId: string) => Promise<void>;
}) {
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tightening, setTightening] = useState(false);
  const meta = CONSISTENCY_META[question.consistencyBadge];
  const Icon = meta.icon;
  const words = wordCount(question.answer);
  const overLimit = words > ANSWER_WORD_CEILING;

  async function handleSubmit() {
    if (!info.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitInfo(question.id, info.trim());
      setInfo("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTighten() {
    setTightening(true);
    try {
      await onTighten(question.id);
    } finally {
      setTightening(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-medium text-foreground">{question.question}</p>
        <p className="text-sm text-muted-foreground">{question.answer}</p>

        <div className="flex flex-wrap items-center gap-3">
          <span className={cn("font-semibold tabular-nums text-sm", scoreColorClass(question.reviewScore))}>
            {question.reviewScore}
          </span>
          <Badge className={cn("gap-1", meta.className)}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
          {question.isLowConfidence && <Badge variant="warning">Low confidence</Badge>}
          <span
            className={cn(
              "ml-auto text-xs tabular-nums",
              overLimit ? "font-semibold text-warning" : "text-muted-foreground"
            )}
          >
            {words}/{ANSWER_WORD_CEILING} words
          </span>
          <Button variant="ghost" size="sm" onClick={handleTighten} disabled={tightening}>
            {tightening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
            Tighten
          </Button>
        </div>
        <Rationale text={question.consistencyNote} />

        {question.isLowConfidence && question.missingInfoPrompt && (
          <div className="space-y-2 rounded-md border border-warning/30 bg-warning/5 p-3">
            <p className="text-xs text-warning">{question.missingInfoPrompt}</p>
            <div className="flex gap-2">
              <Input
                value={info}
                onChange={(e) => setInfo(e.target.value)}
                placeholder="Provide the missing detail…"
                disabled={submitting}
              />
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !info.trim()}>
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Use this"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
