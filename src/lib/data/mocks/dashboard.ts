import type { ActivityItem, PipelineSummary } from "@/lib/types";

export const mockPipeline: PipelineSummary = {
  jobsAnalyzed: { value: 47, delta: 12, label: "Jobs analyzed" },
  proposalsSent: { value: 28, delta: 8, label: "Proposals sent" },
  replies: { value: 11, delta: 15, label: "Replies" },
  interviews: { value: 5, delta: -5, label: "Interviews" },
};

export const mockActivity: ActivityItem[] = [
  {
    id: "act-1",
    type: "analyzed",
    title: "Analyzed job",
    description: "SaaS Marketing Site Redesign — verdict Apply (72% win)",
    timestamp: "2026-04-03T09:15:00Z",
    jobId: "job-1",
  },
  {
    id: "act-2",
    type: "proposal_drafted",
    title: "Proposal drafted",
    description: "Draft ready for SaaS Marketing Site Redesign",
    timestamp: "2026-04-03T10:00:00Z",
    jobId: "job-1",
  },
  {
    id: "act-3",
    type: "analyzed",
    title: "Analyzed job",
    description: "Make coaching site pretty — verdict Skip",
    timestamp: "2026-04-03T20:30:00Z",
    jobId: "job-5",
  },
  {
    id: "act-4",
    type: "reply",
    title: "Client replied",
    description: "Brand identity for DTC skincare — asked about timeline",
    timestamp: "2026-04-01T16:20:00Z",
    jobId: "job-3",
  },
  {
    id: "act-5",
    type: "proposal_sent",
    title: "Proposal sent",
    description: "Submitted branding proposal for GlowTheory-style brief",
    timestamp: "2026-03-29T14:20:00Z",
    jobId: "job-3",
  },
  {
    id: "act-6",
    type: "interview",
    title: "Interview scheduled",
    description: "Shopify rebuild outdoor apparel — intro call Friday",
    timestamp: "2026-03-31T18:00:00Z",
    jobId: "job-4",
  },
  {
    id: "act-7",
    type: "knowledge_added",
    title: "Portfolio updated",
    description: "Added TrailCo PDP rebuild case metrics",
    timestamp: "2026-03-28T11:00:00Z",
  },
  {
    id: "act-8",
    type: "analyzed",
    title: "Analyzed job",
    description: "Local SEO dental clinics — verdict Borderline",
    timestamp: "2026-04-02T16:40:00Z",
    jobId: "job-2",
  },
];
