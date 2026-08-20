import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { EmptyState } from "@/components/empty-state";
import { Newspaper } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog — Altpitch",
  description: "Notes on winning Upwork proposals, freelance pricing, and how Altpitch is built.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
        <div className="mt-8">
          <EmptyState
            icon={Newspaper}
            title="Nothing published yet"
            description="Notes on winning Upwork proposals and how Altpitch is built are coming soon."
          />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
