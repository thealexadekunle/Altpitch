import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proposal = await scopedDb(session.user.id).proposals.get(params.id);
  return NextResponse.json({ proposal: proposal ?? null });
}

const PatchSchema = z.object({ sections: z.array(z.record(z.string(), z.unknown())) });

/** Used by "updateProposalSection" — the caller (lib/data/proposals.service.ts) reads the
 * current proposal, edits one section client-side, and sends the whole sections array back. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsedBody = PatchSchema.safeParse(json);
  if (!parsedBody.success) return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });

  const updated = await scopedDb(session.user.id).proposals.update(params.id, { sections: parsedBody.data.sections });
  if (!updated) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

  return NextResponse.json({ proposal: updated });
}
