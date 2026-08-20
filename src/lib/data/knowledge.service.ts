import type {
  CaseStudy,
  FaqEntry,
  KnowledgeBase,
  KnowledgeCategory,
  Niche,
  PortfolioItem,
  ServiceOffering,
  Testimonial,
  WritingStyleEntry,
  UserSettings,
  WritingStylePreferences,
} from "@/lib/types";
import { throwForFailedResponse } from "@/lib/data/api-error";
import type { knowledgeItems, profiles } from "@/lib/db/schema";

type KnowledgeRow = typeof knowledgeItems.$inferSelect;
type ProfileRow = typeof profiles.$inferSelect;

/**
 * `knowledge_items` is deliberately generic (title, body, niche_tags, outcome_metric, url) —
 * one table for six UI shapes, per the Phase 2 schema. Each kind packs its extra fields as
 * JSON in `body`; dedicated columns are used wherever the shape already fits.
 */
function parseBody<T>(body: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(body) };
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Row <-> type mapping, one pair per kind
// ---------------------------------------------------------------------------
function rowToPortfolioItem(row: KnowledgeRow): PortfolioItem {
  const extra = parseBody(row.body, { description: "" });
  return {
    id: row.id,
    title: row.title,
    nicheTags: row.nicheTags as Niche[],
    outcomeMetric: row.outcomeMetric ?? "",
    link: row.url ?? undefined,
    description: extra.description,
    createdAt: row.createdAt.toString(),
  };
}

function rowToCaseStudy(row: KnowledgeRow): CaseStudy {
  const extra = parseBody(row.body, { challenge: "", approach: "", result: "", metrics: [] as string[] });
  return {
    id: row.id,
    title: row.title,
    niche: (row.nicheTags[0] as Niche) ?? "other",
    challenge: extra.challenge,
    approach: extra.approach,
    result: extra.result,
    metrics: extra.metrics,
    createdAt: row.createdAt.toString(),
  };
}

function rowToTestimonial(row: KnowledgeRow): Testimonial {
  const extra = parseBody(row.body, { clientName: "", clientRole: "", quote: "", rating: 5 });
  return {
    id: row.id,
    clientName: extra.clientName,
    clientRole: extra.clientRole,
    quote: extra.quote,
    niche: (row.nicheTags[0] as Niche) ?? "other",
    rating: extra.rating,
    createdAt: row.createdAt.toString(),
  };
}

function rowToService(row: KnowledgeRow): ServiceOffering {
  const extra = parseBody(row.body, { description: "" });
  return {
    id: row.id,
    name: row.title,
    description: extra.description,
    niches: row.nicheTags as Niche[],
    typicalPrice: row.outcomeMetric ?? "",
    createdAt: row.createdAt.toString(),
  };
}

function rowToWritingStyle(row: KnowledgeRow): WritingStyleEntry {
  const extra = parseBody(row.body, { sample: "", notes: "" });
  return {
    id: row.id,
    name: row.title,
    sample: extra.sample,
    notes: extra.notes,
    createdAt: row.createdAt.toString(),
  };
}

function rowToFaq(row: KnowledgeRow): FaqEntry {
  return {
    id: row.id,
    question: row.title,
    answer: row.body,
    tags: row.nicheTags,
    createdAt: row.createdAt.toString(),
  };
}

export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  const res = await fetch("/api/knowledge");
  if (!res.ok) await throwForFailedResponse(res, "Couldn't load knowledge base.");
  const { items } = (await res.json()) as { items: KnowledgeRow[] };

  return {
    portfolio: items.filter((r) => r.kind === "portfolio").map(rowToPortfolioItem),
    caseStudies: items.filter((r) => r.kind === "case_study").map(rowToCaseStudy),
    testimonials: items.filter((r) => r.kind === "testimonial").map(rowToTestimonial),
    services: items.filter((r) => r.kind === "service").map(rowToService),
    writingStyle: items.filter((r) => r.kind === "style").map(rowToWritingStyle),
    faqs: items.filter((r) => r.kind === "faq").map(rowToFaq),
  };
}

export async function getKnowledgeByCategory(
  category: KnowledgeCategory
): Promise<KnowledgeBase[keyof KnowledgeBase]> {
  const kb = await getKnowledgeBase();
  const map: Record<KnowledgeCategory, keyof KnowledgeBase> = {
    portfolio: "portfolio",
    "case-studies": "caseStudies",
    testimonials: "testimonials",
    services: "services",
    "writing-style": "writingStyle",
    faqs: "faqs",
  };
  return kb[map[category]];
}

interface KnowledgeItemPayload {
  kind: "portfolio" | "case_study" | "testimonial" | "service" | "style" | "faq";
  title: string;
  body: string;
  nicheTags: string[];
  outcomeMetric?: string | null;
  url?: string | null;
}

async function upsertKnowledgeRow(payload: KnowledgeItemPayload, id?: string): Promise<KnowledgeRow> {
  const res = id
    ? await fetch(`/api/knowledge/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    : await fetch("/api/knowledge/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

  if (!res.ok) await throwForFailedResponse(res, "Couldn't save knowledge item.");
  const body = (await res.json()) as { item: KnowledgeRow };
  return body.item;
}

export async function upsertPortfolioItem(
  item: Omit<PortfolioItem, "id" | "createdAt"> & { id?: string }
): Promise<PortfolioItem> {
  const row = await upsertKnowledgeRow(
    {
      kind: "portfolio",
      title: item.title,
      body: JSON.stringify({ description: item.description }),
      nicheTags: item.nicheTags,
      outcomeMetric: item.outcomeMetric,
      url: item.link ?? null,
    },
    item.id
  );
  return rowToPortfolioItem(row);
}

export async function deletePortfolioItem(id: string): Promise<void> {
  const res = await fetch(`/api/knowledge/items/${id}`, { method: "DELETE" });
  if (!res.ok) await throwForFailedResponse(res, "Couldn't delete item.");
}

export async function upsertCaseStudy(
  item: Omit<CaseStudy, "id" | "createdAt"> & { id?: string }
): Promise<CaseStudy> {
  const row = await upsertKnowledgeRow(
    {
      kind: "case_study",
      title: item.title,
      body: JSON.stringify({ challenge: item.challenge, approach: item.approach, result: item.result, metrics: item.metrics }),
      nicheTags: [item.niche],
    },
    item.id
  );
  return rowToCaseStudy(row);
}

export async function upsertTestimonial(
  item: Omit<Testimonial, "id" | "createdAt"> & { id?: string }
): Promise<Testimonial> {
  const row = await upsertKnowledgeRow(
    {
      kind: "testimonial",
      title: `${item.clientName} — ${item.clientRole}`,
      body: JSON.stringify({ clientName: item.clientName, clientRole: item.clientRole, quote: item.quote, rating: item.rating }),
      nicheTags: [item.niche],
    },
    item.id
  );
  return rowToTestimonial(row);
}

export async function upsertService(
  item: Omit<ServiceOffering, "id" | "createdAt"> & { id?: string }
): Promise<ServiceOffering> {
  const row = await upsertKnowledgeRow(
    {
      kind: "service",
      title: item.name,
      body: JSON.stringify({ description: item.description }),
      nicheTags: item.niches,
      outcomeMetric: item.typicalPrice,
    },
    item.id
  );
  return rowToService(row);
}

export async function upsertWritingStyle(
  item: Omit<WritingStyleEntry, "id" | "createdAt"> & { id?: string }
): Promise<WritingStyleEntry> {
  const row = await upsertKnowledgeRow(
    {
      kind: "style",
      title: item.name,
      body: JSON.stringify({ sample: item.sample, notes: item.notes }),
      nicheTags: [],
    },
    item.id
  );
  return rowToWritingStyle(row);
}

export async function upsertFaq(
  item: Omit<FaqEntry, "id" | "createdAt"> & { id?: string }
): Promise<FaqEntry> {
  const row = await upsertKnowledgeRow(
    {
      kind: "faq",
      title: item.question,
      body: item.answer,
      nicheTags: item.tags,
    },
    item.id
  );
  return rowToFaq(row);
}

// ---------------------------------------------------------------------------
// Settings / current user — profiles table
// ---------------------------------------------------------------------------
const DEFAULT_WRITING_STYLE: WritingStylePreferences = {
  tone: "professional",
  formality: 60,
  maxProposalWords: 250,
  avoidPhrases: [],
  preferredOpening: "",
  answerLength: "standard",
};

export async function getSettings(): Promise<UserSettings> {
  const res = await fetch("/api/settings");
  if (!res.ok) await throwForFailedResponse(res, "Couldn't load settings.");
  const { profile, email } = (await res.json()) as { profile: ProfileRow; email: string };

  return {
    name: profile.name,
    email: email ?? "",
    title: profile.title,
    timezone: profile.timezone,
    currency: profile.currency,
    writingStyle: { ...DEFAULT_WRITING_STYLE, ...(profile.writingStyle as Partial<WritingStylePreferences>) },
  };
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getSettings();
  const next: UserSettings = {
    ...current,
    ...patch,
    writingStyle: { ...current.writingStyle, ...(patch.writingStyle ?? {}) },
  };

  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: next.name,
      title: next.title,
      timezone: next.timezone,
      currency: next.currency,
      writingStyle: next.writingStyle,
    }),
  });
  if (!res.ok) await throwForFailedResponse(res, "Couldn't save settings.");

  return next;
}

export async function getCurrentUser() {
  const [settings, res] = await Promise.all([getSettings(), fetch("/api/settings")]);
  const { id } = (await res.json()) as { id: string };
  return {
    id,
    name: settings.name,
    email: settings.email,
    title: settings.title,
    timezone: settings.timezone,
    currency: settings.currency,
    writingStyle: settings.writingStyle,
    avatarInitials: settings.name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  };
}
