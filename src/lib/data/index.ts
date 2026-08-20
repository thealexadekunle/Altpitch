/**
 * Altpitch data service layer.
 *
 * Components import ONLY from this module (or sibling service files via this barrel) — never
 * the database or Anthropic directly, and never lib/data/mocks/* (unused leftover from the
 * original frontend-only build).
 */

export {
  listJobs,
  getJob,
  analyzeJob,
  getTodaysQueue,
} from "./jobs.service";

export {
  getProposalByJobId,
  finishProposalDraft,
  getProposal,
  updateProposalSection,
  rewriteSection,
  getScreeningQuestions,
  updateScreeningAnswer,
  proposalToPlainText,
} from "./proposals.service";

export {
  getKnowledgeBase,
  getKnowledgeByCategory,
  upsertPortfolioItem,
  deletePortfolioItem,
  upsertCaseStudy,
  upsertTestimonial,
  upsertService,
  upsertWritingStyle,
  upsertFaq,
  getSettings,
  updateSettings,
  getCurrentUser,
} from "./knowledge.service";

export { getDashboard, getAnalytics } from "./analytics.service";

export {
  uploadAttachment,
  getAttachments,
  getPendingAttachments,
  deleteAttachment,
  ACCEPTED_MIME_TYPES,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE,
} from "./attachments.service";

export { tightenAnswer } from "./proposals.service";

export { getBillingStatus, startSubscriptionCheckout, startTopUpCheckout } from "./billing.service";
export type { BillingStatus } from "./billing.service";

export { getInsights, dismissInsight } from "./insights.service";
export type { InsightView } from "./insights.service";
