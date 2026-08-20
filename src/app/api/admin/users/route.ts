import { NextResponse } from "next/server";
import { withAdmin, adminDb } from "@/lib/admin/require-admin";
import { user, profiles } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Better Auth's own `user` table lives in this same database (see schema/auth.ts), so this is
 * just a plain Drizzle query — no separate admin identity API needed. Fine at admin-tool scale;
 * revisit with a real search index if the user base outgrows fetching everyone. */
export async function GET(request: Request) {
  return withAdmin(request, async () => {
    const db = adminDb();
    const search = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";

    const [users, profileRows] = await Promise.all([db.select().from(user), db.select().from(profiles)]);

    const profileByUserId = new Map(profileRows.map((p) => [p.userId, p]));

    const shaped = users
      .map((u) => {
        const profile = profileByUserId.get(u.id);
        return {
          id: u.id,
          email: u.email,
          name: profile?.name ?? u.name ?? "",
          role: profile?.role ?? "user",
          suspended: profile?.suspended ?? false,
          createdAt: u.createdAt,
          lastSignInAt: null as string | null, // Better Auth doesn't track this on `user`; last session's createdAt would need a join if wanted later
        };
      })
      .filter((u) => !search || u.email.toLowerCase().includes(search) || u.name.toLowerCase().includes(search))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return NextResponse.json({ users: shaped });
  });
}
