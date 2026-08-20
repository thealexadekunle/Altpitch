import "server-only";
import { arrayContains } from "drizzle-orm";
import type { ScopedDb } from "@/lib/db/scoped";
import { knowledgeItems } from "@/lib/db/schema";

/** Referenced in the real pgvector query documented below — not yet used by the niche-tag fallback. */
export const SIMILARITY_THRESHOLD = 0.75;
const TOP_K = 8;

/**
 * Stage 5 — Retriever. Cosine similarity over `knowledge_items.embedding`, dropped below
 * threshold rather than padded to TOP_K (weak proof is worse than less proof).
 *
 * Embeddings aren't wired yet — no embedding provider key is configured (Anthropic doesn't
 * offer an embeddings endpoint; Voyage AI is the documented pairing for Claude). Until
 * `embedKnowledgeItem` below is implemented and backfilled, this falls back to a niche-tag
 * match so the pipeline stays functional. Swap for a real cosine query once ready, e.g.:
 *
 *   scoped.knowledgeItems.list({ orderBy: cosineDistance(knowledgeItems.embedding, queryEmbedding), limit: TOP_K })
 *
 * (pgvector's `<=>` cosine-distance operator, exposed in Drizzle via `l2Distance`/raw `sql` —
 * keeping the query server-side avoids pulling every embedding over the wire.)
 */
export async function retrieveKnowledgeItems(scoped: ScopedDb, niche: string) {
  const items = await scoped.knowledgeItems.list({ where: arrayContains(knowledgeItems.nicheTags, [niche]), limit: TOP_K });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    outcomeMetric: item.outcomeMetric,
  }));
}

/** Placeholder — wire to Voyage AI (or your chosen embedding provider) once a key exists. */
export async function embedKnowledgeItem(text: string): Promise<number[] | null> {
  if (!process.env.VOYAGE_API_KEY) return null;
  throw new Error(`embedKnowledgeItem: implement once VOYAGE_API_KEY is configured (received ${text.length} chars)`);
}
