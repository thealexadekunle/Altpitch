import type { AnalyticsData, AnalyticsWeekPoint, DashboardData, ActivityItem, NichePerformance, Niche } from "@/lib/types";
import { throwForFailedResponse } from "@/lib/data/api-error";
import { getTodaysQueue } from "@/lib/data/jobs.service";
import { nicheLabel } from "@/lib/utils";
import type { jobs, outcomes, proposals, knowledgeItems } from "@/lib/db/schema";

type JobRow = typeof jobs.$inferSelect;
type OutcomeRow = typeof outcomes.$inferSelect;
type ProposalRow = typeof proposals.$inferSelect;
type KnowledgeRow = typeof knowledgeItems.$inferSelect;

const DAY_MS = 24 * 60 * 60 * 1000;

function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) await throwForFailedResponse(res, "Couldn't load dashboard.");
  const { jobs: jobRows, outcomes: outcomeRows, proposals: proposalRows, knowledge: knowledgeRows } = (await res.json()) as {
    jobs: JobRow[];
    outcomes: OutcomeRow[];
    proposals: ProposalRow[];
    knowledge: KnowledgeRow[];
  };

  const now = Date.now();
  const periodStart = new Date(now - 7 * DAY_MS).toISOString();
  const priorStart = new Date(now - 14 * DAY_MS).toISOString();

  const countInPeriod = <T extends { occurredAt?: Date | string; createdAt?: Date | string }>(rows: T[], start: string, end?: string) =>
    rows.filter((r) => {
      const ts = (r.occurredAt ?? r.createdAt ?? "").toString();
      return ts >= start && (!end || ts < end);
    }).length;

  const outcomesOfType = (event: string) => outcomeRows.filter((o) => o.event === event);

  const jobsAnalyzedNow = countInPeriod(jobRows, periodStart);
  const jobsAnalyzedPrev = countInPeriod(jobRows, priorStart, periodStart);
  const sentNow = countInPeriod(outcomesOfType("sent"), periodStart);
  const sentPrev = countInPeriod(outcomesOfType("sent"), priorStart, periodStart);
  const repliesNow = countInPeriod(outcomesOfType("reply"), periodStart);
  const repliesPrev = countInPeriod(outcomesOfType("reply"), priorStart, periodStart);
  const interviewsNow = countInPeriod(outcomesOfType("interview"), periodStart);
  const interviewsPrev = countInPeriod(outcomesOfType("interview"), priorStart, periodStart);

  const recentActivity: ActivityItem[] = [
    ...jobRows.slice(0, 5).map((j) => ({
      id: `job-${j.id}`,
      type: "analyzed" as const,
      title: "Analyzed job",
      description: "New job analysis available",
      timestamp: j.createdAt.toString(),
      jobId: j.id,
    })),
    ...proposalRows.map((p) => ({
      id: `proposal-${p.id}`,
      type: "proposal_drafted" as const,
      title: "Proposal drafted",
      description: "Draft ready to review",
      timestamp: p.createdAt.toString(),
      jobId: p.jobId,
    })),
    ...outcomeRows.map((o) => ({
      id: `outcome-${o.jobId}-${o.event}-${o.occurredAt}`,
      type: (o.event === "sent"
        ? "proposal_sent"
        : o.event === "reply"
          ? "reply"
          : o.event === "interview"
            ? "interview"
            : "analyzed") as ActivityItem["type"],
      title: o.event === "sent" ? "Proposal sent" : o.event === "reply" ? "Client replied" : o.event === "interview" ? "Interview scheduled" : "Outcome logged",
      description: "",
      timestamp: o.occurredAt.toString(),
      jobId: o.jobId,
    })),
    ...knowledgeRows.map((k) => ({
      id: `knowledge-${k.id}`,
      type: "knowledge_added" as const,
      title: "Knowledge base updated",
      description: k.title,
      timestamp: k.createdAt.toString(),
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return {
    pipeline: {
      jobsAnalyzed: { value: jobsAnalyzedNow, delta: deltaPct(jobsAnalyzedNow, jobsAnalyzedPrev), label: "Jobs analyzed" },
      proposalsSent: { value: sentNow, delta: deltaPct(sentNow, sentPrev), label: "Proposals sent" },
      replies: { value: repliesNow, delta: deltaPct(repliesNow, repliesPrev), label: "Replies" },
      interviews: { value: interviewsNow, delta: deltaPct(interviewsNow, interviewsPrev), label: "Interviews" },
    },
    todaysQueue: await getTodaysQueue(),
    recentActivity,
  };
}

/**
 * Real aggregates from `jobs` + `outcomes` + `analyses`. Per the Phase 2 spec, niche/hook-type
 * performance beyond raw outcome recording is Phase 3 territory (needs `proposal_outcomes_flat`,
 * which doesn't exist yet) — so `byHookType` returns empty here rather than fabricating hook
 * styles nothing in this schema tracks. `byNiche` is real: niche is on every job.
 */
export async function getAnalytics(): Promise<AnalyticsData> {
  const res = await fetch("/api/analytics");
  if (!res.ok) await throwForFailedResponse(res, "Couldn't load analytics.");
  const { jobs: allJobs, outcomes: allOutcomes } = (await res.json()) as { jobs: JobRow[]; outcomes: OutcomeRow[] };

  const jobIdToNiche = new Map(
    allJobs.map((j) => [j.id, ((j.parsed as { niche?: Niche } | null)?.niche ?? "other") as Niche])
  );

  // --- weekly series ---
  const weekStart = (d: Date) => {
    const copy = new Date(d);
    const day = copy.getUTCDay();
    copy.setUTCDate(copy.getUTCDate() - day);
    copy.setUTCHours(0, 0, 0, 0);
    return copy;
  };

  const series: AnalyticsWeekPoint[] = [];
  const now = weekStart(new Date());
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getTime() - i * 7 * DAY_MS);
    const end = new Date(start.getTime() + 7 * DAY_MS);
    const analyzed = allJobs.filter((j) => j.createdAt.toString() >= start.toISOString() && j.createdAt.toString() < end.toISOString()).length;
    const inWeek = (event: string) =>
      allOutcomes.filter((o) => o.event === event && o.occurredAt.toString() >= start.toISOString() && o.occurredAt.toString() < end.toISOString()).length;
    const applied = inWeek("sent");
    const replied = inWeek("reply");
    const interviewed = inWeek("interview");
    const hired = inWeek("hire");
    series.push({
      week: `W${String(52 - i).padStart(2, "0")}`,
      weekStart: start.toISOString(),
      replyRate: pct(replied, applied),
      interviewRate: pct(interviewed, applied),
      hireRate: pct(hired, applied),
      analyzed,
      applied,
      replied,
      interviewed,
      hired,
    });
  }

  // --- by niche ---
  const nicheBuckets = new Map<Niche, { applications: number; replies: number; interviews: number }>();
  for (const outcome of allOutcomes) {
    const niche = jobIdToNiche.get(outcome.jobId) ?? "other";
    const bucket = nicheBuckets.get(niche) ?? { applications: 0, replies: 0, interviews: 0 };
    if (outcome.event === "sent") bucket.applications += 1;
    if (outcome.event === "reply") bucket.replies += 1;
    if (outcome.event === "interview") bucket.interviews += 1;
    nicheBuckets.set(niche, bucket);
  }
  const byNiche: NichePerformance[] = Array.from(nicheBuckets.entries()).map(([niche, b]) => ({
    niche,
    label: nicheLabel(niche),
    replyRate: pct(b.replies, b.applications),
    interviewRate: pct(b.interviews, b.applications),
    applications: b.applications,
  }));

  // --- funnel ---
  const totalAnalyzed = allJobs.length;
  const totalApplied = allOutcomes.filter((o) => o.event === "sent").length;
  const totalReplied = allOutcomes.filter((o) => o.event === "reply").length;
  const totalInterviewed = allOutcomes.filter((o) => o.event === "interview").length;
  const totalHired = allOutcomes.filter((o) => o.event === "hire").length;

  return {
    series,
    byNiche,
    byHookType: [],
    funnel: [
      { stage: "Analyzed", count: totalAnalyzed, conversionFromPrevious: null },
      { stage: "Applied", count: totalApplied, conversionFromPrevious: pct(totalApplied, totalAnalyzed) },
      { stage: "Replied", count: totalReplied, conversionFromPrevious: pct(totalReplied, totalApplied) },
      { stage: "Interviewed", count: totalInterviewed, conversionFromPrevious: pct(totalInterviewed, totalReplied) },
      { stage: "Hired", count: totalHired, conversionFromPrevious: pct(totalHired, totalInterviewed) },
    ],
    summary: {
      overallReplyRate: pct(totalReplied, totalApplied),
      overallInterviewRate: pct(totalInterviewed, totalApplied),
      overallHireRate: pct(totalHired, totalApplied),
    },
  };
}
