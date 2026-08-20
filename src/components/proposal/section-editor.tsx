"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ProposalSection, ProposalSectionKey } from "@/lib/types";

interface SectionEditorProps {
  section: ProposalSection;
  onSave: (key: ProposalSectionKey, content: string) => void;
  onRewrite: (key: ProposalSectionKey) => Promise<void>;
}

export function SectionEditor({ section, onSave, onRewrite }: SectionEditorProps) {
  const [value, setValue] = useState(section.content);
  const [rewriting, setRewriting] = useState(false);

  useEffect(() => {
    setValue(section.content);
  }, [section.content]);

  async function handleRewrite() {
    setRewriting(true);
    try {
      await onRewrite(section.key);
    } finally {
      setRewriting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={`section-${section.key}`}
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {section.label}
        </label>
        <Button variant="ghost" size="sm" onClick={handleRewrite} disabled={rewriting}>
          {rewriting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Rewrite section
        </Button>
      </div>
      <Textarea
        id={`section-${section.key}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== section.content) onSave(section.key, value);
        }}
        className="prose-reading min-h-24"
      />
    </div>
  );
}
