import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { runStage } from "@/lib/ai/client";
import { SectionRewriteSchema, ProposalSectionKeySchema } from "@/lib/ai/schemas";
import { buildRewriteSectionPrompt } from "@/lib/ai/prompts/rewrite-section";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import type { ProposalSection } from "@/lib/types";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  proposalId: z.string().uuid(),
  sectionKey: ProposalSectionKeySchema,
});

/** "Rewrite section" — real Writer call for one section, replacing the Phase 1 mock's
 * content/alternativeContent swap. */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scoped = scopedDb(session.user.id);

  const rateLimit = await checkRateLimit(`user:${session.user.id}`, RATE_LIMITS.default);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const json = await request.json().catch(() => null);
  const parsedBody = BodySchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });
  }

  const proposal = await scoped.proposals.get(parsedBody.data.proposalId);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const sections = proposal.sections as unknown as ProposalSection[];
  const target = sections.find((s) => s.key === parsedBody.data.sectionKey);
  if (!target) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const { system, prompt } = buildRewriteSectionPrompt(
    parsedBody.data.sectionKey,
    target.content,
    JSON.stringify(sections)
  );

  try {
    const result = await runStage({
      stage: "rewriteSection",
      system,
      prompt,
      schema: SectionRewriteSchema,
      userId: session.user.id,
      proposalId: proposal.id,
    });

    const updatedSections = sections.map((s) =>
      s.key === parsedBody.data.sectionKey ? { ...s, alternativeContent: s.content, content: result.content } : s
    );

    const updated = await scoped.proposals.update(proposal.id, { sections: updatedSections });
    if (!updated) throw new Error("Failed to persist rewritten section");

    return NextResponse.json({ sections: updatedSections });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rewrite failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
