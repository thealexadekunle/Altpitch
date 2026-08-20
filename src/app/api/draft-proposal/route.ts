import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { runProposalPipeline } from "@/lib/ai/pipeline";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ jobId: z.string().uuid() });

/** Stages 5, 6, 8, 9, 10 — runs on "Draft proposal". Streamed as SSE (Corrections 02): the
 * Writer generates one section at a time, Hook first, so the Studio shows real content within
 * a few seconds instead of a blocked screen for the full ~30-40s draft. */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const userId = session.user.id;

  const rateLimit = await checkRateLimit(`user:${userId}`, RATE_LIMITS.default);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const json = await request.json().catch(() => null);
  const parsedBody = BodySchema.safeParse(json);
  if (!parsedBody.success) {
    return new Response(JSON.stringify({ error: parsedBody.error.message }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const event of runProposalPipeline(userId, parsedBody.data.jobId)) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        if (event.stage === "complete" || event.stage === "error") break;
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
