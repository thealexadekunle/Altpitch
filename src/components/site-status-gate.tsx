"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, Construction } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface SiteAnnouncement {
  id: string;
  message: string;
  level: "info" | "warning" | "critical";
}

interface SiteStatus {
  maintenanceMode: boolean;
  announcements: SiteAnnouncement[];
}

const LEVEL_STYLES: Record<SiteAnnouncement["level"], string> = {
  info: "border-border bg-card/60 text-foreground",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** Reads /api/site-status once per mount and reacts to it — the consumer half of the admin
 * feature-flags and announcements CRUD (AUDIT_REPORT.md P1-7: those admin panels existed but
 * toggling anything in them had no effect anywhere in the app). Admin routes are exempt from the
 * maintenance block so an admin can always reach /admin/flags to turn it back off. */
export function SiteStatusGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<SiteStatus | null>(null);

  useEffect(() => {
    fetch("/api/site-status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  const isAdminRoute = pathname.startsWith("/admin");

  if (status?.maintenanceMode && !isAdminRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Construction className="h-4 w-4 text-accent" />
              Down for maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Altpitch is offline for a short maintenance window. Nothing about your account or data has changed —
              check back shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {status?.announcements.map((a) => (
        <div key={a.id} className={`flex items-center gap-2 border-b px-4 py-2 text-sm md:px-8 ${LEVEL_STYLES[a.level]}`}>
          {a.level !== "info" && <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span>{a.message}</span>
        </div>
      ))}
      {children}
    </>
  );
}
