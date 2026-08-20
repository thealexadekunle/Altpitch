import { z } from "zod";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { scopedDb } from "@/lib/db/scoped";
import { jobs } from "@/lib/db/schema";
import { runAnalysisPipeline } from "@/lib/ai/pipeline";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { checkCredit, consumeCredit, refundCredit } from "@/lib/billing/credits";
import { getRequestIp } from "@/lib/request-ip";
import { logAudit } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  rawText: z.string().min(1),
  manualQuestions: z.array(z.string()).max(10).optional(),
  attachmentIds: z.array(z.string().uuid()).optional(),
});

/** Stages 1–4 + 7, streamed as SSE so the client can drive the staged skeleton in real time.
 * This is the expensive route: rate-limited tighter than everything else, and gated by the
 * user's trial/plan credit — a repaste of an already-analyzed post skips the pipeline entirely. */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;
  const scoped = scopedDb(userId);

  const rateLimit = await checkRateLimit(`user:${userId}`, RATE_LIMITS.analyze);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const json = await request.json().catch(() => null);
  const parsedBody = BodySchema.safeParse(json);
  if (!parsedBody.success) {
    return new Response(parsedBody.error.message, { status: 400 });
  }

  const contentHash = createHash("sha256").update(parsedBody.data.rawText.trim()).digest("hex");

  // Identical repaste of an already-analyzed post: skip the pipeline, return the existing job.
  const [existing] = await scoped.jobs.list({ where: eq(jobs.contentHash, contentHash), limit: 1 });

  if (existing) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ stage: "complete", jobId: existing.id, cached: true })}\n\n`)
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }

  const credit = await checkCredit(userId);
  if (!credit.allowed) {
    return new Response(
      JSON.stringify({
        error: credit.balance.hasActiveSubscription ? "credits_exhausted" : "trial_exhausted",
        balance: credit.balance,
      }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }

  const job = await scoped.jobs.insert({ rawPost: parsedBody.data.rawText, status: "analyzed", contentHash });
  if (!job) {
    return new Response("Failed to create job", { status: 500 });
  }

  if (parsedBody.data.attachmentIds?.length) {
    await Promise.all(parsedBody.data.attachmentIds.map((id) => scoped.attachments.update(id, { jobId: job.id })));
  }

  // The bucket is remembered so a refund lands back where it was spent — refunding a top-up
  // credit into the monthly grant would quietly delete a credit the user paid for.
  const spentBucket = await consumeCredit(userId);
  await logAudit({ actorId: userId, action: "analyze.start", target: job.id, ip: getRequestIp(request) });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let succeeded = false;
      for await (const event of runAnalysisPipeline(userId, job.id, parsedBody.data.rawText, parsedBody.data.manualQuestions ?? [])) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        if (event.stage === "complete") succeeded = true;
        if (event.stage === "complete" || event.stage === "error") break;
      }
      if (!succeeded && spentBucket) {
        await refundCredit(userId, spentBucket);
        await logAudit({ actorId: userId, action: "analyze.failed_refunded", target: job.id });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
