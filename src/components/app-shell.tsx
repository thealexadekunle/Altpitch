"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanSearch,
  BookOpen,
  BarChart3,
  Settings,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreditChip } from "@/components/billing/credit-chip";
import { DunningBanner } from "@/components/billing/dunning-banner";
import { SiteStatusGate } from "@/components/site-status-gate";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyze", label: "Analyze", icon: ScanSearch },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const CHROMELESS_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];
// Marketing pages ship their own header/footer (see components/marketing/) — not the app sidebar.
const MARKETING_ROUTES = ["/pricing", "/terms", "/privacy", "/blog"];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Auth pages, the public marketing site, and the admin dashboard (which ships its own shell
  // in app/admin/layout.tsx) are all chromeless here — no double sidebar.
  if (
    CHROMELESS_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname === "/" ||
    pathname.startsWith("/admin") ||
    MARKETING_ROUTES.some((route) => pathname.startsWith(route))
  ) {
    return <SiteStatusGate>{children}</SiteStatusGate>;
  }

  return (
    <SiteStatusGate>
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-border md:bg-card/40">
        <div className="flex h-14 items-center gap-2 px-5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-accent">
            <Target className="h-3.5 w-3.5 text-accent-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Altpitch</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-accent">
              <Target className="h-3.5 w-3.5 text-accent-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Altpitch</span>
          </div>
          <CreditChip />
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden justify-end border-b border-border px-4 py-2 md:flex md:px-8">
          <CreditChip />
        </div>

        <ImpersonationBanner />
        <DunningBanner />

        <main className="flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
    </SiteStatusGate>
  );
}
