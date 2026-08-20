import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { deleteFromR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scoped = scopedDb(session.user.id);

  const row = await scoped.attachments.get(params.id);
  if (!row) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

  await deleteFromR2(row.storagePath);
  await scoped.attachments.remove(params.id);

  return NextResponse.json({ ok: true });
}
