"use client";

import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useState } from "react";

/** Expandable "why" — reasoning stays visible one interaction away wherever a score or verdict renders. */
export function Rationale({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        Why
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1.5 text-xs leading-relaxed text-muted-foreground">
        {text}
      </CollapsibleContent>
    </Collapsible>
  );
}
