import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "Privacy Policy — Altpitch",
  description: "How Altpitch collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Placeholder — pending legal review before launch.</p>
        <div className="mt-8 space-y-4 text-sm text-muted-foreground">
          <p>
            This page is a placeholder. Altpitch&apos;s privacy policy — covering what data is collected, how job
            posts and portfolio content are used by the AI pipeline, and how to request deletion — will be published
            here before the product accepts paying customers.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
