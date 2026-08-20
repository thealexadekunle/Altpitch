"use client";

import { useId, useRef } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_QUESTIONS = 10;

interface ClientQuestionsInputProps {
  questions: string[];
  onChange: (questions: string[]) => void;
}

/** Manual "Client questions" capture on /analyze — dynamic add/remove, capped at 10, fully
 * keyboard operable, with additions/removals announced to screen readers via aria-live. */
export function ClientQuestionsInput({ questions, onChange }: ClientQuestionsInputProps) {
  const announceRef = useRef<HTMLDivElement>(null);
  const groupId = useId();

  function announce(message: string) {
    if (announceRef.current) announceRef.current.textContent = message;
  }

  function addQuestion() {
    if (questions.length >= MAX_QUESTIONS) return;
    onChange([...questions, ""]);
    announce(`Question ${questions.length + 1} added.`);
  }

  function updateQuestion(index: number, value: string) {
    onChange(questions.map((q, i) => (i === index ? value : q)));
  }

  function removeQuestion(index: number) {
    onChange(questions.filter((_, i) => i !== index));
    announce(`Question ${index + 1} removed.`);
  }

  return (
    <div className="space-y-2" role="group" aria-labelledby={groupId}>
      <div className="flex items-center justify-between">
        <Label id={groupId}>Client questions</Label>
        <span className="text-xs text-muted-foreground">{questions.length}/{MAX_QUESTIONS}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Screening questions the client asked, if you have them. The analyzer also auto-detects questions inside the pasted post.
      </p>

      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => updateQuestion(i, e.target.value)}
              placeholder={`Question ${i + 1}`}
              aria-label={`Client question ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => removeQuestion(i)}
              className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-danger"
              aria-label={`Remove question ${i + 1}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addQuestion}
        disabled={questions.length >= MAX_QUESTIONS}
      >
        <Plus /> Add another question
      </Button>

      <div ref={announceRef} className="sr-only" role="status" aria-live="polite" />
    </div>
  );
}
