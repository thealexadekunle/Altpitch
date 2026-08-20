/**
 * Corrections 03 §3b — niche packs. One product serves every niche professionally instead of
 * averaging into blandness: the Strategist and the Writer load the pack matching the niche the
 * Parser detected, and the pack decides what counts as proof, how to sound, and what to ask.
 *
 * Unrecognized niches fall back to `default` and log the miss (see `getNichePack`) so new packs
 * get written from real demand rather than guessed at.
 */
export interface NichePack {
  id: string;
  label: string;
  /** What actually convinces a client in this niche — the Writer cites this shape of proof. */
  proof: string;
  /** Vocabulary register: the words a competent practitioner in this niche uses unselfconsciously. */
  register: string;
  /** The one question worth a client's time here. Signals expertise, moves the deal. */
  question: string;
  /** How the mirror-first opening should land for this niche. */
  hook: string;
}

export const NICHE_PACKS = {
  "web-design": {
    id: "web-design",
    label: "Web design & development",
    proof:
      "Live URLs the client can open right now, and before/after on a concrete metric (load time, bounce rate, conversion rate, mobile Lighthouse score). Named stack when the post names a stack.",
    register:
      "Practitioner-plain. Say 'load time', 'checkout flow', 'CMS', 'responsive breakpoints'. Never 'digital presence', 'cutting-edge', 'seamless experience'.",
    question:
      "Ask about the constraint behind the build — existing stack they must keep, who edits content after launch, or the deadline the site is tied to.",
    hook: "Name the site problem they described in their own framing (slow, dated, not converting, can't edit it themselves) before anything else.",
  },
  seo: {
    id: "seo",
    label: "SEO",
    proof:
      "Ranking and traffic movement with a timeframe: keyword positions before/after, organic sessions delta, indexed page counts. Never 'first page guaranteed'.",
    register:
      "Technical and measured. 'Crawl budget', 'internal linking', 'search intent', 'topical authority'. Never 'SEO magic', 'dominate Google', 'skyrocket'.",
    question:
      "Ask what they have already tried and what their analytics currently show — the answer separates a technical problem from a content problem.",
    hook: "Name the specific visibility problem (traffic drop, new site with no rankings, competitor outranking them) in their words.",
  },
  branding: {
    id: "branding",
    label: "Branding",
    proof:
      "Visual samples — identity systems shipped, the category the brand competed in, and what changed for the business afterward. Show, don't adjective.",
    register:
      "Concrete design language. 'Wordmark', 'identity system', 'positioning', 'brand voice'. Never 'iconic', 'timeless', 'brand DNA'.",
    question:
      "Ask who the brand needs to beat in the customer's mind — positioning against a named competitor beats abstract aesthetics.",
    hook: "Name the positioning problem behind the request (blending in, outgrown their old look, new audience) as they framed it.",
  },
  "e-commerce": {
    id: "e-commerce",
    label: "E-commerce",
    proof:
      "Revenue metrics: conversion rate lift, average order value, cart abandonment reduction, revenue per session — with the store platform named.",
    register:
      "Commercial and specific. 'AOV', 'checkout abandonment', 'product feed', 'Shopify/WooCommerce'. Never 'boost sales', 'maximize revenue'.",
    question:
      "Ask where in the funnel they lose people, or what their current conversion rate is — it decides whether this is a traffic problem or a store problem.",
    hook: "Name the revenue problem they described (traffic that doesn't buy, abandoned carts, a migration that hurt sales).",
  },
  "email-marketing": {
    id: "email-marketing",
    label: "Email marketing",
    proof:
      "Open rates, click-through rates, and revenue per send or per subscriber, with list size and sending platform named. Flow-level results beat campaign one-offs.",
    register:
      "Lifecycle vocabulary. 'Welcome flow', 'segmentation', 'deliverability', 'Klaviyo/Mailchimp'. Never 'engaging content', 'blast'.",
    question:
      "Ask about list health and current flows — how the list was built and what automations already exist decides where the first win is.",
    hook: "Name the list problem in their terms (list not monetized, opens falling, no automation beyond a newsletter).",
  },
  default: {
    id: "default",
    label: "General",
    proof:
      "The closest comparable outcome, stated as a number and a timeframe, with the context that makes it comparable to this job.",
    register: "Plain, specific, practitioner-level. No superlatives, no marketing abstractions.",
    question: "Ask the one question whose answer would most change how the work is scoped.",
    hook: "Name the client's stated problem or goal in their own framing before anything else.",
  },
} as const satisfies Record<string, NichePack>;

export type NicheId = keyof typeof NICHE_PACKS;

/** Misses are logged, not silently defaulted — a niche showing up here repeatedly earns a pack. */
export function getNichePack(niche: string | null | undefined): NichePack {
  const pack = NICHE_PACKS[niche as NicheId];
  if (pack) return pack;
  console.warn(`[niche-pack] no pack for niche "${niche ?? "(none)"}" — using default`);
  return NICHE_PACKS.default;
}
