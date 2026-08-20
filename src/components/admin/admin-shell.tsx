"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ShieldAlert, Megaphone, Flag, ArrowLeft, KeyRound, Activity, DollarSign, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/billing", label: "Billing", icon: DollarSign },
  { href: "/admin/ops", label: "Ops", icon: Activity },
  { href: "/admin/abuse", label: "Abuse controls", icon: ShieldAlert },
  { href: "/admin/flags", label: "Feature flags", icon: Flag },
  { href: "/admin/broadcast", label: "Broadcast", icon: Megaphone },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/security", label: "Security", icon: KeyRound },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children, twoFactorEnabled }: { children: React.ReactNode; twoFactorEnabled: boolean }) {
  const pathname = usePathname();
  const onSecurityPage = pathname === "/admin/security";
  // Every /api/admin/* route independently enforces 2FA (requireAdmin in lib/admin/require-admin.ts)
  // — this block is a UX courtesy, not the security boundary. It exists so a not-yet-enrolled
  // admin sees why every panel is empty instead of a wall of failed fetches.
  const blocked = !twoFactorEnabled && !onSecurityPage;

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-border md:bg-card/40">
        <div className="flex h-14 items-center gap-2 px-5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-destructive">
            <ShieldAlert className="h-3.5 w-3.5 text-destructive-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Admin</span>
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
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
          <span className="text-sm font-semibold tracking-tight">Admin</span>
          <Link href="/dashboard" className="text-xs text-muted-foreground">Back to app</Link>
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
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">
          {blocked ? (
            <div className="mx-auto max-w-md">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-destructive" />
                    Enroll 2FA to continue
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Admin and owner accounts require TOTP two-factor authentication. This account
                    hasn&apos;t enrolled yet, so every admin panel is locked until it does.
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/admin/security">Enroll now</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
