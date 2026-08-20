"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Copy, Download, ListChecks, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getJob,
  getProposalByJobId,
  updateProposalSection,
  rewriteSection,
  proposalToPlainText,
  getKnowledgeBase,
  finishProposalDraft,
} from "@/lib/data";
import type { ProposalDraftProgress } from "@/lib/data/proposals.service";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { SectionEditor } from "@/components/proposal/section-editor";
import { ReviewPanel } from "@/components/proposal/review-panel";
import { ContextPanel } from "@/components/proposal/context-panel";
import { HumanizeDiffView } from "@/components/proposal/humanize-diff";
import { ProposalLengthMeter } from "@/components/proposal/length-meter";
import { proposalCharCount } from "@/lib/ai/proposal-rules";
import type { JobAnalysis, PortfolioItem, Proposal, ProposalSection, ProposalSectionKey } from "@/lib/types";

const STAGE_LABEL: Record<string, string> = {
  strategizing: "Choosing an angle and selecting proof…",
  reviewing: "Reviewing and fact-checking the draft…",
};

export default function ProposalStudioPage({ params }: { params: { id: string } }) {
  const jobId = params.id;
  const { humanizeView, setHumanizeView } = useAppStore();

  const [job, setJob] = useState<JobAnalysis | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftStage, setDraftStage] = useState<string | null>(null);
  const [streamingSections, setStreamingSections] = useState<ProposalSection[]>([]);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStreamingSections([]);

    function handleProgress(event: ProposalDraftProgress) {
      if (cancelled) return;
      if (event.stage === "section") {
        setDraftStage(null);
        setStreamingSections((prev) => [
          ...prev,
          { key: event.key, label: event.label, content: event.content, alternativeContent: event.alternativeContent },
        ]);
      } else {
        setDraftStage(event.stage);
      }
    }

    Promise.all([getJob(jobId), getProposalByJobId(jobId, handleProgress), getKnowledgeBase()])
      .then(([jobRes, proposalRes, kb]) => {
        if (cancelled) return;
        if (!jobRes || !proposalRes) {
          setError("Job or proposal not found.");
          return;
        }
        setJob(jobRes);
        setProposal(proposalRes);
        setPortfolioItems(
          kb.portfolio.filter((p) => proposalRes.selectedPortfolioIds.includes(p.id))
        );
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function handleFinishGeneration() {
    if (!proposal || finishing) return;
    setFinishing(true);
    try {
      const finished = await finishProposalDraft(jobId);
      if (finished) setProposal(finished);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't finish generation.");
    } finally {
      setFinishing(false);
    }
  }

  async function handleSave(key: ProposalSectionKey, content: string) {
    if (!proposal) return;
    try {
      const updated = await updateProposalSection(proposal.id, key, content);
      setProposal(updated);
    } catch {
      toast.error("Couldn't save section.");
    }
  }

  async function handleRewrite(key: ProposalSectionKey) {
    if (!proposal) return;
    try {
      const updated = await rewriteSection(proposal.id, key);
      setProposal(updated);
      toast.success("Section rewritten with alternative variant.");
    } catch {
      toast.error("Rewrite failed.");
    }
  }

  function handleCopy() {
    if (!proposal) return;
    navigator.clipboard.writeText(proposalToPlainText(proposal));
    toast.success("Copied proposal to clipboard.");
  }

  function handleDownload() {
    if (!proposal) return;
    const blob = new Blob([proposalToPlainText(proposal)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposal-${jobId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState message={error} />
      </div>
    );
  }

  // Drafting in progress: sections stream in one at a time, Hook first — this is the real
  // pipeline generating, not a skeleton, so show whatever's landed rather than blocking.
  if (loading && !job) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  if (loading || !proposal) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-fade-in">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href={`/jobs/${jobId}`} className="hover:text-foreground">{job?.title}</Link>
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Proposal Studio</h1>
        </div>
        {draftStage && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {STAGE_LABEL[draftStage] ?? "Drafting…"}
          </div>
        )}
        {streamingSections.map((section) => (
          <Card key={section.key} className="animate-settle-in">
            <CardContent className="space-y-2 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</p>
              <p className="prose-reading text-foreground">{section.content}</p>
            </CardContent>
          </Card>
        ))}
        {streamingSections.length < 7 && (
          <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Writing {streamingSections.length === 0 ? "hook" : "next section"}…
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href={`/jobs/${jobId}`} className="hover:text-foreground">{job?.title}</Link>
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Proposal Studio</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download /> Download .txt
          </Button>
          <Button asChild size="sm">
            <Link href={`/jobs/${jobId}/screening`}>
              <ListChecks /> Screening answers
            </Link>
          </Button>
        </div>
      </div>

      {proposal.partial && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            This run stopped before the draft was complete. Finishing resumes from what is already written.
          </p>
          <Button size="sm" onClick={handleFinishGeneration} disabled={finishing}>
            {finishing ? <Loader2 className="animate-spin" /> : <PlayCircle />} Finish generation
          </Button>
        </div>
      )}

      {proposal.noProofMode && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>
            Nothing in your knowledge base matched this job, so the proof section is marked with a gap instead of a
            claim. Add a relevant work sample before sending.
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {proposal.sections.map((section) => (
            <Card key={section.key}>
              <CardContent className="p-4">
                <SectionEditor section={section} onSave={handleSave} onRewrite={handleRewrite} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <ProposalLengthMeter chars={proposalCharCount(proposal.sections)} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <Tabs defaultValue="context">
                <TabsList>
                  <TabsTrigger value="context">Context</TabsTrigger>
                  <TabsTrigger value="review">Review</TabsTrigger>
                  <TabsTrigger value="humanize">Humanize</TabsTrigger>
                </TabsList>
                <TabsContent value="context">
                  {job && <ContextPanel job={job} strategyAngle={proposal.strategyAngle} portfolioItems={portfolioItems} />}
                </TabsContent>
                <TabsContent value="review">
                  <ReviewPanel review={proposal.review} />
                </TabsContent>
                <TabsContent value="humanize">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Show humanize diff</span>
                      <Switch checked={humanizeView} onCheckedChange={setHumanizeView} />
                    </div>
                    {humanizeView && <HumanizeDiffView diff={proposal.humanizedDiff ?? []} />}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
