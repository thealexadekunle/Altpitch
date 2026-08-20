"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "owner";
  suspended: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      const url = query ? `/api/admin/users?q=${encodeURIComponent(query)}` : "/api/admin/users";
      fetch(url)
        .then((r) => r.json())
        .then((body) => setUsers(body.users ?? []));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Search, inspect, suspend.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search email or name…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {!users && (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {users && users.length === 0 && <p className="p-5 text-sm text-muted-foreground">No users found.</p>}
          {users && users.length > 0 && (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <Link
                  key={u.id}
                  href={`/admin/users/${u.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-foreground">{u.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.name || "No name set"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {u.role !== "user" && <Badge variant="accent">{u.role}</Badge>}
                    {u.suspended && <Badge variant="destructive">suspended</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
