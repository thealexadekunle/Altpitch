import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { checkCredit } from "@/lib/billing/credits";
import { getCurrentPlan } from "@/lib/billing/billing.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [credit, plan] = await Promise.all([checkCredit(session.user.id), getCurrentPlan(session.user.id)]);

  return NextResponse.json({ plan, credits: { ...credit.balance, allowed: credit.allowed } });
}
