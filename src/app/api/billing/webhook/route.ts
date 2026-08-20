import { NextResponse } from "next/server";
import { z } from "zod";
import { billingProvider, upsertSubscription } from "@/lib/billing/billing.service";
import { grantTopUpPack, resetMonthlyGrant } from "@/lib/billing/credits";
import { PLAN, TOP_UP_PACKS } from "@/lib/billing/plans";
import { logAudit } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

/**
 * Provider webhook — the only place credits are granted. Signature is verified before the body is
 * parsed, and the body is never trusted for anything but the ids it carries.
 *
 * Credit rules (Corrections 03 §5): a renewal resets the monthly grant and leaves top-ups alone;
 * a top-up purchase adds to the non-expiring bucket; a lapse changes subscription status only —
 * top-up credits are retained on the row and simply become unspendable until a subscription is
 * active again (enforced in lib/billing/credits.ts, not by deleting anything here).
 */
const EventSchema = z.object({
  type: z.enum([
    "subscription.activated",
    "subscription.renewed",
    "subscription.past_due",
    "subscription.canceled",
    "topup.purchased",
  ]),
  userId: z.string().min(1),
  providerCustomerId: z.string().optional(),
  providerSubscriptionId: z.string().optional(),
  currentPeriodEnd: z.string().datetime().optional(),
  pack: z.enum(["small", "medium", "large"]).optional(),
});

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("webhook-signature") ?? "";

  if (!billingProvider.verifyWebhookSignature({ payload, signature })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = EventSchema.safeParse(JSON.parse(payload) as unknown);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const event = parsed.data;

  const setStatus = (status: "active" | "past_due" | "canceled") =>
    upsertSubscription({
      userId: event.userId,
      status,
      providerCustomerId: event.providerCustomerId ?? null,
      providerSubscriptionId: event.providerSubscriptionId ?? null,
      currentPeriodEnd: event.currentPeriodEnd ? new Date(event.currentPeriodEnd) : null,
    });

  switch (event.type) {
    case "subscription.activated":
    case "subscription.renewed":
      await setStatus("active");
      await resetMonthlyGrant(event.userId, PLAN.monthlyCredits);
      break;

    // Dunning: access is kept while the provider retries, per the Corrections 02 grace behaviour.
    case "subscription.past_due":
      await setStatus("past_due");
      break;

    case "subscription.canceled":
      await setStatus("canceled");
      break;

    case "topup.purchased": {
      if (!event.pack) return NextResponse.json({ error: "topup.purchased requires a pack" }, { status: 400 });
      await grantTopUpPack(event.userId, event.pack, billingProvider.name);
      break;
    }
  }

  await logAudit({
    actorId: event.userId,
    action: `billing.${event.type}`,
    target: event.pack ? `${TOP_UP_PACKS[event.pack].credits} credits` : PLAN.id,
  });

  return NextResponse.json({ ok: true });
}
