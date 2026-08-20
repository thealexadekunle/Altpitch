"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function readMarkerCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )altpitch_impersonating=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Reads the non-httpOnly marker cookie set by startImpersonation — carries no secret, just the
 * target's email so this banner can say who. The actual impersonation token is httpOnly and
 * never touches client JS. Renders app-wide (see app-shell.tsx) since impersonation can be
 * active while browsing any page. */
export function ImpersonationBanner() {
  const router = useRouter();
  const [targetEmail, setTargetEmail] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    setTargetEmail(readMarkerCookie());
  }, []);

  if (!targetEmail) return null;

  async function handleStop() {
    setStopping(true);
    try {
      await fetch("/api/admin/impersonate/stop", { method: "POST" });
      router.push("/admin/users");
      router.refresh();
    } catch {
      toast.error("Couldn't stop impersonation.");
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-accent/40 bg-accent/10 px-4 py-2 text-sm md:px-8">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 shrink-0 text-accent" />
        <span>
          Viewing as <span className="font-medium text-foreground">{targetEmail}</span> — read-only admin impersonation.
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={handleStop} disabled={stopping}>
        {stopping ? <Loader2 className="animate-spin" /> : null}
        Exit
      </Button>
    </div>
  );
}
