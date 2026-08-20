import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ScanSearch, PenTool, BarChart3, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TRIAL_CREDITS } from "@/lib/billing/plans";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Altpitch — AI Proposal OS for Upwork Freelancers",
  description:
    "Judgment, not generation. Score every Upwork job before you bid, then draft proposals grounded in your real portfolio — never invented experience.",
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: ScanSearch,
    title: "Score before you bid",
    description: "Fit, win probability, ROI, and red flags on every job post — decide in seconds, not minutes.",
  },
  {
    icon: PenTool,
    title: "Proposals grounded in your work",
    description: "The Writer only cites portfolio and case studies you've actually added — never invented experience.",
  },
  {
    icon: BarChart3,
    title: "Learn what actually wins",
    description: "Track outcomes and let calibration sharpen your scoring model over time.",
  },
  {
    icon: ShieldCheck,
    title: "Built for real client posts",
    description: "Screening answers, attachments, and hidden requirements — handled, not ignored.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Altpitch",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "AI proposal operating system for Upwork freelancers — job scoring, proposal drafting grounded in real portfolio content, and outcome tracking.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: `${TRIAL_CREDITS} free analyses, no card required`,
  },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Static, server-authored content only — no user input reaches this JSON, so no
          sanitization concern for the raw dangerouslySetInnerHTML below. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <MarketingHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Judgment, not generation.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Altpitch scores every Upwork job before you write a word, then drafts proposals grounded in your real
            portfolio — so you spend your time on the jobs worth winning.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Start free — {TRIAL_CREDITS} analyses on us
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="h-5 w-5 text-accent" />
                  <CardTitle className="mt-3 text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
