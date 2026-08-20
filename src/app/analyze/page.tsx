"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { analyzeJob } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisSkeleton } from "@/components/job/analysis-skeleton";
import { ClientQuestionsInput } from "@/components/analyze/client-questions-input";
import { AttachmentDropzone } from "@/components/analyze/attachment-dropzone";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { getBillingStatus, type BillingStatus } from "@/lib/data";
import { authClient } from "@/lib/auth/client";
import { MailWarning, Loader2 } from "lucide-react";
import type { AnalysisStage } from "@/lib/types";

const SAMPLE_PLACEHOLDER = `Paste the full Upwork job post here — title, description, budget, and screening questions if shown.

Example:
"We need a Shopify expert to rebuild our PDP for a DTC skincare brand. Budget $2,500. Payment verified, $40k+ spent. Must show past ecommerce work..."`;

export default function AnalyzePage() {
  const router = useRouter();
  const { pasteDraft, setPasteDraft } = useAppStore();
  const [manualQuestions, setManualQuestions] = useState<string[]>([]);
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<AnalysisStage>("idle");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const { data: session } = authClient.useSession();

  async function handleAnalyze() {
    if (!pasteDraft.trim()) {
      toast.error("Paste a job post first.");
      return;
    }
    setSubmitting(true);
    setStage("parsing");
    try {
      const { jobId } = await analyzeJob(
        {
          rawText: pasteDraft,
          manualQuestions: manualQuestions.map((q) => q.trim()).filter(Boolean),
          attachmentIds,
        },
        setStage
      );
      setPasteDraft("");
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      if (err instanceof Error && err.message === "credits_exhausted") {
        getBillingStatus()
          .then(setBillingStatus)
          .catch(() => {});
        setShowUpgradeModal(true);
      } else if (err instanceof Error && err.message === "email_not_verified") {
        setNeedsVerification(true);
      } else {
        toast.error(err instanceof Error ? err.message : "Analysis failed.");
      }
      setSubmitting(false);
      setStage("idle");
    }
  }

  async function handleResendVerification() {
    if (!session?.user.email) return;
    setResending(true);
    try {
      await authClient.sendVerificationEmail({ email: session.user.email, callbackURL: "/analyze" });
      toast.success("Verification email sent — check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send verification email.");
    } finally {
      setResending(false);
    }
  }

  if (submitting) {
    return (
      <div className="mx-auto max-w-3xl animate-fade-in">
        <AnalysisSkeleton stage={stage} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        status={billingStatus}
        title={billingStatus?.credits.hasActiveSubscription ? "You're out of credits" : "You've used your free runs"}
        description="One credit runs the whole pipeline: analysis, proposal, and screening answers."
      />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analyze a job</h1>
        <p className="text-sm text-muted-foreground">
          Paste the raw Upwork post. Altpitch scores fit, win probability, ROI, and competition, then tells you Apply, Skip, or Borderline — with reasoning.
        </p>
      </div>

      {needsVerification && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium">Verify your email to run your first analysis</p>
                <p className="text-xs text-muted-foreground">
                  We sent a link to {session?.user.email ?? "your email"} when you signed up. Didn&apos;t get it?
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleResendVerification} disabled={resending}>
              {resending ? <Loader2 className="animate-spin" /> : null}
              Resend email
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-5 p-5">
          <Textarea
            value={pasteDraft}
            onChange={(e) => setPasteDraft(e.target.value)}
            placeholder={SAMPLE_PLACEHOLDER}
            className="min-h-72 resize-y font-mono text-sm leading-relaxed"
          />
          <p className="-mt-3 text-xs text-muted-foreground">{pasteDraft.length.toLocaleString()} characters</p>

          <ClientQuestionsInput questions={manualQuestions} onChange={setManualQuestions} />

          <AttachmentDropzone jobId={null} attachmentIds={attachmentIds} onAttachmentIdsChange={setAttachmentIds} />

          <div className="flex justify-end border-t border-border pt-4">
            <Button size="lg" onClick={handleAnalyze}>
              <ScanSearch />
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
