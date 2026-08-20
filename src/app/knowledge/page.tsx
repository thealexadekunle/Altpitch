"use client";

import { getKnowledgeBase } from "@/lib/data";
import { useAsync } from "@/lib/hooks/use-async";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { PortfolioSection } from "@/components/knowledge/portfolio-section";
import { CaseStudySection } from "@/components/knowledge/case-study-section";
import { TestimonialSection } from "@/components/knowledge/testimonial-section";
import { ServiceSection } from "@/components/knowledge/service-section";
import { WritingStyleSection } from "@/components/knowledge/writing-style-section";
import { FaqSection } from "@/components/knowledge/faq-section";

export default function KnowledgePage() {
  const { data, loading, error, reload } = useAsync(() => getKnowledgeBase(), []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">
          What the Writer is allowed to cite. It never invents experience beyond what&apos;s here.
        </p>
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}

      {!error && (loading || !data) && (
        <div className="space-y-3">
          <Skeleton className="h-9 w-96 rounded-lg" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {!error && data && (
        <Tabs defaultValue="portfolio">
          <TabsList>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="case-studies">Case studies</TabsTrigger>
            <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="writing-style">Writing style</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
          </TabsList>
          <TabsContent value="portfolio">
            <PortfolioSection items={data.portfolio} onChanged={reload} />
          </TabsContent>
          <TabsContent value="case-studies">
            <CaseStudySection items={data.caseStudies} onChanged={reload} />
          </TabsContent>
          <TabsContent value="testimonials">
            <TestimonialSection items={data.testimonials} onChanged={reload} />
          </TabsContent>
          <TabsContent value="services">
            <ServiceSection items={data.services} onChanged={reload} />
          </TabsContent>
          <TabsContent value="writing-style">
            <WritingStyleSection items={data.writingStyle} onChanged={reload} />
          </TabsContent>
          <TabsContent value="faqs">
            <FaqSection items={data.faqs} onChanged={reload} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
