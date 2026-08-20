import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { billingProvider } from "@/lib/billing/billing.service";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Either the single subscription or one top-up pack (Corrections 03 §5). */
const BodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("subscription") }),
  z.object({ kind: z.literal("topup"), pack: z.enum(["small", "medium", "large"]) }),
]);

/** Starts a checkout session with whichever provider is wired in billing.service.ts. Until a
 * real one is, this returns a clean 501 instead of a raw stack trace — the "scaffold now, wire
 * keys later" plan means this route works end-to-end today and just needs its provider swapped. */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`user:${session.user.id}`, RATE_LIMITS.default);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const json = await request.json().catch(() => null);
  const parsedBody = BodySchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });
  }

  try {
    const checkoutSession =
      parsedBody.data.kind === "subscription"
        ? await billingProvider.createSubscriptionCheckout({ userId: session.user.id, email: session.user.email })
        : await billingProvider.createTopUpCheckout({
            userId: session.user.id,
            email: session.user.email,
            pack: parsedBody.data.pack,
          });
    return NextResponse.json(checkoutSession);
  } catch {
    return NextResponse.json(
      { error: "Billing isn't wired up yet — this can't be purchased in this environment." },
      { status: 501 }
    );
  }
}
