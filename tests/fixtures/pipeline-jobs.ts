/**
 * Five job posts across five niches, plus the knowledge base each one is meant to retrieve
 * against. `emailNoProof` deliberately has NO matching knowledge item — it is the fixture that
 * proves no-proof mode renders a flagged draft instead of nothing (Corrections 03 §1).
 */
export interface PipelineFixture {
  key: string;
  niche: string;
  rawPost: string;
  /** Knowledge items seeded for this fixture's user. Empty means the Retriever must come back dry. */
  knowledge: { title: string; body: string; outcomeMetric: string; nicheTags: string[] }[];
}

export const PIPELINE_FIXTURES: PipelineFixture[] = [
  {
    key: "webRedesign",
    niche: "web-design",
    rawPost: `Need a Webflow redesign for our B2B SaaS marketing site — $4,000 fixed.

Our current site was built in 2019 and it takes about 6 seconds to load on mobile. We're getting traffic from ads but almost nobody books a demo. Our marketing lead needs to be able to edit pages without asking a developer every time.

Timeline: we want it live before our conference in 10 weeks.
Please describe a similar project you have done.`,
    knowledge: [
      {
        title: "Sitewide rebuild for Northgate Analytics",
        body: "Rebuilt a 2018-era WordPress marketing site in Webflow with a component library the marketing team edits directly. Mobile load went from 5.8s to 1.4s.",
        outcomeMetric: "Demo bookings up 62% in 90 days",
        nicheTags: ["web-design"],
      },
    ],
  },
  {
    key: "seoAudit",
    niche: "seo",
    rawPost: `Looking for an SEO consultant. Hourly, $50-80/hr.

Organic traffic dropped roughly 40% after we migrated our blog to a new CMS in March. We think URLs changed but nobody is sure. Search Console shows a lot of pages excluded. We need someone to find out what broke and fix it.

What is your process for a migration recovery?`,
    knowledge: [
      {
        title: "Migration recovery for Halden Press",
        body: "Diagnosed a CMS migration that dropped 3,100 URLs without redirects. Rebuilt the redirect map, fixed canonical tags, resubmitted sitemaps.",
        outcomeMetric: "Organic sessions recovered to 108% of pre-migration within 11 weeks",
        nicheTags: ["seo"],
      },
    ],
  },
  {
    key: "brandIdentity",
    niche: "branding",
    rawPost: `Brand identity for a new specialty coffee roaster. Budget $2,500 fixed.

We are launching in a market with three established roasters who all look the same — dark, masculine, heritage-styled. We want to reach people who find that intimidating. Need a wordmark, packaging direction, and basic brand guidelines.`,
    knowledge: [
      {
        title: "Identity system for Marrow & Co",
        body: "Built a full identity for a challenger CPG brand entering a crowded shelf: wordmark, packaging system, and voice guidelines aimed at first-time buyers rather than category enthusiasts.",
        outcomeMetric: "Shelf trial rate 2.3x category average in first retail quarter",
        nicheTags: ["branding"],
      },
    ],
  },
  {
    key: "ecommerceCro",
    niche: "e-commerce",
    rawPost: `Shopify store conversion help needed — $3,000 fixed, possible ongoing.

We get about 40,000 sessions a month but convert at 0.9%. Cart abandonment is over 80%. We sell mid-priced home goods. We suspect checkout is the problem but we're not sure. Payment verified, we've hired 14 freelancers here before.

How would you diagnose this?`,
    knowledge: [
      {
        title: "Checkout rebuild for Fern & Filament",
        body: "Rebuilt a Shopify checkout flow: removed a forced account-creation step, added express payment, restructured shipping-cost disclosure earlier in the funnel.",
        outcomeMetric: "Conversion rate 1.1% to 2.4%, cart abandonment down 19 points",
        nicheTags: ["e-commerce"],
      },
    ],
  },
  {
    key: "emailNoProof",
    niche: "email-marketing",
    rawPost: `Klaviyo email marketing for a supplements brand. $1,500/month retainer.

We have a list of 22,000 people built mostly from a giveaway last year. Open rates have fallen to around 12%. We send one newsletter a month and have no automated flows at all. We want welcome and abandoned-cart flows set up and the list cleaned.

Have you worked with supplements before? What are your open rates typically?`,
    // Intentionally empty: this is the no-proof-mode fixture.
    knowledge: [],
  },
];
