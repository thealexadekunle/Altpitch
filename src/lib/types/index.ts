/** Shared domain types — single source of truth for Phase 1 contract. */

export type Verdict = "apply" | "skip" | "borderline";
export type Niche = "web-design" | "seo" | "branding" | "e-commerce" | "copywriting" | "other";
export type KnowledgeCategory =
  | "portfolio"
  | "case-studies"
  | "testimonials"
  | "services"
  | "writing-style"
  | "faqs";

export type Score = number; // 0–100

export interface ScoreWithRationale {
  score: Score;
  label: string;
  rationale: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  title: string;
  timezone: string;
  currency: string;
  writingStyle: WritingStylePreferences;
  avatarInitials: string;
}

export interface WritingStylePreferences {
  tone: "professional" | "conversational" | "direct" | "warm";
  formality: number; // 0–100
  maxProposalWords: number;
  avoidPhrases: string[];
  preferredOpening: string;
  /** Screening answer target: concise 40–70 words, standard 70–100. Hard ceiling is always 120. */
  answerLength: "concise" | "standard";
}

export interface ClientQuestion {
  id: string;
  text: string;
  source: "manual" | "auto";
}

export type AttachmentKind = "pdf" | "docx" | "image" | "text";

export interface AttachmentMeta {
  id: string;
  jobId: string;
  filename: string;
  mime: string;
  size: number;
  url: string;
  kind: AttachmentKind;
  createdAt: string;
}

export interface JobBudget {
  type: "fixed" | "hourly";
  min?: number;
  max?: number;
  amount?: number;
  currency: string;
}

export interface JobSummary {
  id: string;
  title: string;
  niche: Niche;
  budget: JobBudget;
  clientCountry?: string;
  postedAt: string;
  analyzedAt: string;
  verdict: Verdict;
  fitScore: Score;
  winProbability: Score;
  roiScore: Score;
  competitionEstimate: "low" | "medium" | "high";
  confidence: Score;
  rawTextPreview: string;
  /** Both raise the effort cost of applying — belong in the apply-or-skip mental math on the queue. */
  questionCount: number;
  hasAttachments: boolean;
}

export interface Deliverable {
  text: string;
  isHidden: boolean;
  rationale?: string;
}

export interface ClientProfile {
  decisionStyle: string;
  inferredValues: string[];
  hiringHistory?: string;
  paymentVerified: boolean;
  spendTier?: string;
  rating?: number;
  jobsPosted?: number;
  hireRate?: number;
  rationale: string;
}

export interface RedFlag {
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  rationale: string;
}

export interface PsychologyRead {
  fears: string[];
  desiredOutcomes: string[];
  trustTriggers: string[];
  bestOpeningAngle: string;
  rationale: string;
}

export interface JobAnalysis extends JobSummary {
  rawText: string;
  deliverables: Deliverable[];
  clientProfile: ClientProfile;
  redFlags: RedFlag[];
  psychology: PsychologyRead;
  scoreBreakdown: ScoreWithRationale[];
  competitionRationale: string;
  verdictRationale: string;
  screeningQuestions: ScreeningQuestion[];
  clientQuestions: ClientQuestion[];
  attachments: AttachmentMeta[];
  hasProposal: boolean;
  proposalId?: string;
}

export type ProposalSectionKey =
  | "hook"
  | "businessProblem"
  | "solution"
  | "proof"
  | "portfolio"
  | "question"
  | "cta";

export interface ProposalSection {
  key: ProposalSectionKey;
  label: string;
  content: string;
  alternativeContent: string;
}

export interface ProposalReviewScores {
  relevance: ScoreWithRationale;
  specificity: ScoreWithRationale;
  readability: ScoreWithRationale;
  authenticity: ScoreWithRationale;
  trust: ScoreWithRationale;
  ctaStrength: ScoreWithRationale;
  predictedReplyLikelihood: ScoreWithRationale;
}

export interface Proposal {
  id: string;
  jobId: string;
  sections: ProposalSection[];
  review: ProposalReviewScores;
  strategyAngle: string;
  selectedPortfolioIds: string[];
  humanizedDiff?: HumanizeDiff[];
  status: "draft" | "sent" | "replied" | "interview" | "hired" | "rejected";
  updatedAt: string;
  /** The Retriever found nothing relevant, so the proof section carries a visible gap marker
   * instead of a claim. A draft with a gap ships; a missing proposal does not. */
  noProofMode: boolean;
  /** Fewer than seven sections, or the run hit the ceiling before review — offer to finish it. */
  partial: boolean;
}

export interface HumanizeDiff {
  sectionKey: ProposalSectionKey;
  before: string;
  after: string;
  changeNote: string;
}

export interface ScreeningQuestion {
  id: string;
  jobId: string;
  question: string;
  answer: string;
  reviewScore: Score;
  confidence: Score;
  isLowConfidence: boolean;
  consistencyBadge: "consistent" | "review" | "conflict";
  consistencyNote: string;
  missingInfoPrompt?: string;
  userSuppliedInfo?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  nicheTags: Niche[];
  outcomeMetric: string;
  link?: string;
  description: string;
  createdAt: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  niche: Niche;
  challenge: string;
  approach: string;
  result: string;
  metrics: string[];
  createdAt: string;
}

export interface Testimonial {
  id: string;
  clientName: string;
  clientRole: string;
  quote: string;
  niche: Niche;
  rating: number;
  createdAt: string;
}

export interface ServiceOffering {
  id: string;
  name: string;
  description: string;
  niches: Niche[];
  typicalPrice: string;
  createdAt: string;
}

export interface WritingStyleEntry {
  id: string;
  name: string;
  sample: string;
  notes: string;
  createdAt: string;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  createdAt: string;
}

export interface KnowledgeBase {
  portfolio: PortfolioItem[];
  caseStudies: CaseStudy[];
  testimonials: Testimonial[];
  services: ServiceOffering[];
  writingStyle: WritingStyleEntry[];
  faqs: FaqEntry[];
}

export interface PipelineSummary {
  jobsAnalyzed: MetricWithTrend;
  proposalsSent: MetricWithTrend;
  replies: MetricWithTrend;
  interviews: MetricWithTrend;
}

export interface MetricWithTrend {
  value: number;
  delta: number; // percentage points vs prior period
  label: string;
}

export interface ActivityItem {
  id: string;
  type: "analyzed" | "proposal_drafted" | "proposal_sent" | "reply" | "interview" | "knowledge_added";
  title: string;
  description: string;
  timestamp: string;
  jobId?: string;
}

export interface DashboardData {
  pipeline: PipelineSummary;
  todaysQueue: JobSummary[];
  recentActivity: ActivityItem[];
}

export interface AnalyticsWeekPoint {
  week: string; // ISO week label e.g. "W01"
  weekStart: string;
  replyRate: number;
  interviewRate: number;
  hireRate: number;
  analyzed: number;
  applied: number;
  replied: number;
  interviewed: number;
  hired: number;
}

export interface NichePerformance {
  niche: Niche;
  label: string;
  replyRate: number;
  interviewRate: number;
  applications: number;
}

export interface HookTypePerformance {
  hookType: string;
  replyRate: number;
  applications: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  conversionFromPrevious: number | null;
}

export interface AnalyticsData {
  series: AnalyticsWeekPoint[];
  byNiche: NichePerformance[];
  byHookType: HookTypePerformance[];
  funnel: FunnelStage[];
  summary: {
    overallReplyRate: number;
    overallInterviewRate: number;
    overallHireRate: number;
  };
}

export interface UserSettings {
  name: string;
  email: string;
  title: string;
  timezone: string;
  currency: string;
  writingStyle: WritingStylePreferences;
}

export interface AnalyzeJobInput {
  rawText: string;
  manualQuestions?: string[];
  attachmentIds?: string[];
}

export interface AnalyzeJobResult {
  jobId: string;
  analysis: JobAnalysis;
}

export type AnalysisStage = "idle" | "parsing" | "scoring" | "breakdown" | "complete" | "error";
