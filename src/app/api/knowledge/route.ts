import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { scopedDb } from "@/lib/db/scoped";
import { knowledgeItems } from "@/lib/db/schema";
import { getImpersonatedOrOwnUserId } from "@/lib/admin/impersonation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const effective = await getImpersonatedOrOwnUserId(request);
  if (!effective) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await scopedDb(effective.userId).knowledgeItems.list({ orderBy: desc(knowledgeItems.createdAt) });
  return NextResponse.json({ items });
}
