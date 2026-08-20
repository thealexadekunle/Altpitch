import type { JobAnalysis, JobSummary } from "@/lib/types";

const rawJob1 = `Looking for an experienced Web Designer to redesign our SaaS marketing site.

We're a B2B analytics platform (Series A) with a site that looks like 2019. Need:
- Full homepage + pricing + features redesign in Figma
- Mobile-first, conversion-focused
- Component library handoff to our React team
- 3–4 week timeline

Budget: $4,000–$6,000 fixed
Must have SaaS portfolio. Please share 2 relevant links and your process for discovery.

About client: Payment verified, $12k spent, 4.9 rating, 8 hires.`;

const rawJob2 = `Need SEO expert ASAP for local dental clinic chain (4 locations in Texas).

Want rankings for "dentist near me" and city + service keywords. Current site is WordPress, no schema, slow.

Budget: $25–$40/hr, ongoing
Looking for someone who can start this week. Send audit sample if you have one.`;

const rawJob3 = `Brand identity package for new DTC skincare line launching Q3.

Need logo, color system, packaging direction, brand guidelines PDF. Founders are non-designers so education is part of the job.

Budget: $3,500 fixed
Prefer freelancers who've done beauty/CPG brands.`;

const rawJob4 = `Shopify store rebuild for outdoor apparel brand. Current theme is bloated, conversion ~1.1%.

Scope: theme rebuild (Dawn or custom), speed optimization, upsell blocks, Klaviyo integration review.

Budget: $8,000–$12,000
Must show before/after conversion work.`;

const rawJob5 = `Urgent: need someone to "make my website pretty" for my coaching business. ASAP. Budget $200 max. I already have Wix. Just need colors changed and maybe a logo. Looking for cheap and fast. Will hire today.`;

const rawJob6 = `Content strategy + on-page SEO for B2B fintech blog. 40 existing posts, want topical clusters and internal linking plan. Also rewrite 8 cornerstone pages.

Budget: $50–$75/hr, 20–30 hrs/month estimated
Looking for someone who understands compliance-adjacent content without being boring.`;

const rawJob7 = `E-commerce product page optimization for 120 SKU catalog (supplements). Need CRO audit + new PDP template + A/B test plan.

Budget: $5,500 fixed
Prefer freelancers with supplement or health brand experience. Client has hired 3 freelancers before on similar work — 2 didn't finish.`;

const rawJob8 = `Logo redesign for established law firm. They want "something modern but still trustworthy." No brand strategy, no research budget — just logo files. Multiple partners will "need to approve." Timeline vague. Budget $800.`;

export const mockJobs: JobAnalysis[] = [
  {
    id: "job-1",
    title: "SaaS Marketing Site Redesign (Figma → React handoff)",
    niche: "web-design",
    budget: { type: "fixed", min: 4000, max: 6000, currency: "USD" },
    clientCountry: "United States",
    postedAt: "2026-04-02T14:20:00Z",
    analyzedAt: "2026-04-03T09:15:00Z",
    verdict: "apply",
    fitScore: 88,
    winProbability: 72,
    roiScore: 81,
    competitionEstimate: "medium",
    confidence: 86,
    rawTextPreview: rawJob1.slice(0, 140) + "…",
    rawText: rawJob1,
    deliverables: [
      {
        text: "Homepage, pricing, and features page redesign in Figma",
        isHidden: false,
      },
      {
        text: "Mobile-first conversion-focused layouts",
        isHidden: false,
      },
      {
        text: "Component library with developer handoff notes",
        isHidden: false,
      },
      {
        text: "Implicit: discovery workshop or async research before pixels",
        isHidden: true,
        rationale:
          "They ask for process for discovery — expect a structured intake even if not listed as a deliverable.",
      },
      {
        text: "Implicit: design QA against React implementation",
        isHidden: true,
        rationale:
          "Handoff to React team usually means 1–2 review cycles; bake into timeline.",
      },
    ],
    clientProfile: {
      decisionStyle: "Collaborative but decisive — Series A team with clear constraints",
      inferredValues: ["Speed to ship", "Conversion metrics", "Design systems maturity"],
      hiringHistory: "Payment verified · $12k spent · 4.9 ★ · 8 hires",
      paymentVerified: true,
      spendTier: "$10k+",
      rating: 4.9,
      jobsPosted: 11,
      hireRate: 0.73,
      rationale:
        "Verified spend and high hire rate suggest a serious buyer. Series A SaaS buyers usually evaluate on portfolio relevance more than price.",
    },
    redFlags: [
      {
        severity: "low",
        title: "Timeline pressure (3–4 weeks)",
        description: "Full marketing site + component library is tight if discovery slips.",
        rationale: "Mitigate by proposing a phased MVP (homepage + pricing first).",
      },
    ],
    psychology: {
      fears: [
        "Hiring a generalist who doesn't understand SaaS conversion patterns",
        "Design that looks pretty but doesn't convert trials",
      ],
      desiredOutcomes: [
        "Modern brand presence matching Series A stage",
        "Clean handoff so engineering isn't blocked",
      ],
      trustTriggers: [
        "SaaS portfolio with measurable lift",
        "Clear discovery process",
        "Component-system thinking",
      ],
      bestOpeningAngle:
        "Call out the 2019-era site problem and name one conversion pattern you'd fix on the homepage first.",
      rationale:
        "Buyer is embarrassed by outdated site and needs confidence you won't slow engineering.",
    },
    scoreBreakdown: [
      {
        score: 92,
        label: "Skill fit",
        rationale: "Direct match to SaaS marketing design + systems work.",
      },
      {
        score: 78,
        label: "Budget fit",
        rationale: "$4–6k is fair for 3–4 weeks if scope is controlled.",
      },
      {
        score: 85,
        label: "Client quality",
        rationale: "Verified payment, strong rating, proven hire rate.",
      },
      {
        score: 70,
        label: "Competition",
        rationale: "SaaS redesigns attract mid-tier competition; strong portfolio wins.",
      },
    ],
    competitionRationale:
      "Expect 15–30 proposals. Differentiation comes from SaaS-specific case studies, not lower rates.",
    verdictRationale:
      "High fit, healthy budget, serious client. Apply with two SaaS links and a 3-phase plan.",
    screeningQuestions: [
      {
        id: "sq-1-1",
        jobId: "job-1",
        question: "Please share 2 relevant SaaS portfolio links.",
        answer:
          "1) Northline Analytics marketing redesign — trial starts +34% in 60 days (link).\n2) PulseHQ pricing page system — reduced bounce 22% (link).",
        reviewScore: 91,
        confidence: 94,
        isLowConfidence: false,
        consistencyBadge: "consistent",
        consistencyNote: "Matches proof section of proposal.",
      },
      {
        id: "sq-1-2",
        jobId: "job-1",
        question: "Describe your discovery process.",
        answer:
          "Week 0: 45-min stakeholder call + analytics review + 5 competitor teardowns. I deliver a one-page problem brief before any Figma work so we align on conversion goals, not aesthetics.",
        reviewScore: 88,
        confidence: 90,
        isLowConfidence: false,
        consistencyBadge: "consistent",
        consistencyNote: "Aligns with solution section framing.",
      },
    ],
    clientQuestions: [],
    attachments: [],
    questionCount: 0,
    hasAttachments: false,
    hasProposal: true,
    proposalId: "prop-1",
  },
  {
    id: "job-2",
    title: "Local SEO for multi-location dental clinics (TX)",
    niche: "seo",
    budget: { type: "hourly", min: 25, max: 40, currency: "USD" },
    clientCountry: "United States",
    postedAt: "2026-04-01T11:00:00Z",
    analyzedAt: "2026-04-02T16:40:00Z",
    verdict: "borderline",
    fitScore: 64,
    winProbability: 48,
    roiScore: 52,
    competitionEstimate: "high",
    confidence: 71,
    rawTextPreview: rawJob2.slice(0, 140) + "…",
    rawText: rawJob2,
    deliverables: [
      { text: "Local pack / map optimization for 4 locations", isHidden: false },
      { text: "On-page + schema for service pages", isHidden: false },
      { text: "Technical fixes on WordPress (speed, schema)", isHidden: false },
      {
        text: "Implicit: GBP optimization and review velocity plan",
        isHidden: true,
        rationale: "Local SEO without GBP work rarely moves 'near me' queries.",
      },
    ],
    clientProfile: {
      decisionStyle: "Speed-first, likely non-technical owner",
      inferredValues: ["Fast start", "Local visibility", "Practical audits"],
      hiringHistory: "Payment verified · $2.1k spent · 4.6 ★ · 3 hires",
      paymentVerified: true,
      spendTier: "$1–5k",
      rating: 4.6,
      jobsPosted: 5,
      hireRate: 0.6,
      rationale:
        "Smaller spend history. 'ASAP' language often means price-sensitive and process-light.",
    },
    redFlags: [
      {
        severity: "medium",
        title: "Rate below market for multi-location local SEO",
        description: "$25–40/hr for 4 locations is thin if they expect full-service SEO.",
        rationale: "Either scope tightly (audit + 30-day pilot) or skip.",
      },
      {
        severity: "medium",
        title: "Urgency without strategy brief",
        description: "Wants start this week with no baseline KPIs stated.",
        rationale: "Risk of endless 'just rank us' expectations.",
      },
    ],
    psychology: {
      fears: ["Paying for SEO that never shows in Maps", "Agencies that vanish after month 1"],
      desiredOutcomes: ["More new-patient calls from Google", "Simple monthly reporting"],
      trustTriggers: ["Sample local audit", "Before/after map pack screenshots"],
      bestOpeningAngle:
        "Lead with a mini observation about multi-location cannibalization risk across 4 TX clinics.",
      rationale: "Local owners buy confidence and clarity, not jargon.",
    },
    scoreBreakdown: [
      { score: 70, label: "Skill fit", rationale: "Local SEO is in wheelhouse but not top niche." },
      { score: 45, label: "Budget fit", rationale: "Hourly range compresses margin for multi-loc work." },
      { score: 62, label: "Client quality", rationale: "Verified but low spend; mixed signals." },
      { score: 40, label: "Competition", rationale: "Local SEO jobs get flooded with low-bid proposals." },
    ],
    competitionRationale: "High volume of generalist SEO proposals. Audit sample is the filter.",
    verdictRationale:
      "Borderline: skill match ok, economics weak. Apply only with a scoped pilot offer or skip.",
    screeningQuestions: [
      {
        id: "sq-2-1",
        jobId: "job-2",
        question: "Do you have an audit sample you can share?",
        answer:
          "Yes — redacted local audit for a multi-location med spa (PDF). Covers GBP gaps, NAP issues, and page-level schema. Happy to walk through the first 3 findings on a 15-min call.",
        reviewScore: 84,
        confidence: 88,
        isLowConfidence: false,
        consistencyBadge: "consistent",
        consistencyNote: "Supports trust-trigger strategy.",
      },
    ],
    clientQuestions: [],
    attachments: [],
    questionCount: 0,
    hasAttachments: false,
    hasProposal: false,
  },
  {
    id: "job-3",
    title: "Brand identity for DTC skincare launch",
    niche: "branding",
    budget: { type: "fixed", amount: 3500, currency: "USD" },
    clientCountry: "Canada",
    postedAt: "2026-03-28T18:00:00Z",
    analyzedAt: "2026-03-29T10:05:00Z",
    verdict: "apply",
    fitScore: 81,
    winProbability: 68,
    roiScore: 74,
    competitionEstimate: "medium",
    confidence: 82,
    rawTextPreview: rawJob3.slice(0, 140) + "…",
    rawText: rawJob3,
    deliverables: [
      { text: "Logo system", isHidden: false },
      { text: "Color system + packaging direction", isHidden: false },
      { text: "Brand guidelines PDF", isHidden: false },
      {
        text: "Implicit: founder education / decision workshops",
        isHidden: true,
        rationale: "They note founders are non-designers — facilitation is part of delivery.",
      },
    ],
    clientProfile: {
      decisionStyle: "Founder-led, education-needed, consensus between co-founders likely",
      inferredValues: ["Premium feel", "Shelf differentiation", "Clear process"],
      hiringHistory: "Payment verified · $4.8k spent · 5.0 ★ · 2 hires",
      paymentVerified: true,
      spendTier: "$1–5k",
      rating: 5.0,
      jobsPosted: 2,
      hireRate: 1.0,
      rationale: "Perfect hire rate and 5.0 rating — careful buyers who reward good process.",
    },
    redFlags: [
      {
        severity: "low",
        title: "Packaging direction may expand scope",
        description: "Packaging can balloon into full dieline work.",
        rationale: "Define 'direction' as 2–3 concepts, not production files.",
      },
    ],
    psychology: {
      fears: ["Looking amateur next to established beauty brands", "Wasting launch budget on weak identity"],
      desiredOutcomes: ["Cohesive premium brand", "Confidence presenting to retailers/investors"],
      trustTriggers: ["Beauty/CPG case studies", "Structured decision framework for non-designers"],
      bestOpeningAngle:
        "Acknowledge the education need — position yourself as a guide, not just a logo vendor.",
      rationale: "Non-designer founders fear being sold jargon; they want hand-holding.",
    },
    scoreBreakdown: [
      { score: 86, label: "Skill fit", rationale: "Strong branding + CPG adjacent work." },
      { score: 72, label: "Budget fit", rationale: "$3.5k works if packaging is direction-only." },
      { score: 88, label: "Client quality", rationale: "5.0 rating, full hire rate." },
      { score: 65, label: "Competition", rationale: "Beauty branding attracts specialists." },
    ],
    competitionRationale: "Medium. Beauty specialists will apply; process clarity differentiates.",
    verdictRationale: "Solid apply — budget fair, client quality high, niche aligned.",
    screeningQuestions: [],
    clientQuestions: [],
    attachments: [],
    questionCount: 0,
    hasAttachments: false,
    hasProposal: true,
    proposalId: "prop-2",
  },
  {
    id: "job-4",
    title: "Shopify rebuild + CRO for outdoor apparel",
    niche: "e-commerce",
    budget: { type: "fixed", min: 8000, max: 12000, currency: "USD" },
    clientCountry: "United States",
    postedAt: "2026-03-30T09:30:00Z",
    analyzedAt: "2026-03-31T12:00:00Z",
    verdict: "apply",
    fitScore: 90,
    winProbability: 76,
    roiScore: 88,
    competitionEstimate: "low",
    confidence: 89,
    rawTextPreview: rawJob4.slice(0, 140) + "…",
    rawText: rawJob4,
    deliverables: [
      { text: "Theme rebuild (Dawn or custom)", isHidden: false },
      { text: "Speed optimization", isHidden: false },
      { text: "Upsell blocks", isHidden: false },
      { text: "Klaviyo integration review", isHidden: false },
      {
        text: "Implicit: conversion baseline + success metrics",
        isHidden: true,
        rationale: "They cite 1.1% conversion — expect you to define target and measurement.",
      },
    ],
    clientProfile: {
      decisionStyle: "Metrics-driven merchant, results over aesthetics",
      inferredValues: ["Conversion rate", "Site speed", "Email revenue"],
      hiringHistory: "Payment verified · $28k spent · 4.8 ★ · 14 hires",
      paymentVerified: true,
      spendTier: "$25k+",
      rating: 4.8,
      jobsPosted: 19,
      hireRate: 0.68,
      rationale: "High spend, experienced hirer. Will evaluate on before/after proof hard.",
    },
    redFlags: [
      {
        severity: "low",
        title: "Broad scope across theme + CRO + Klaviyo",
        description: "Three workstreams; needs clear phasing.",
        rationale: "Propose milestone billing: rebuild → CRO → lifecycle review.",
      },
    ],
    psychology: {
      fears: ["Another pretty theme that doesn't move CVR", "Developer who ignores email revenue"],
      desiredOutcomes: ["CVR meaningfully above 1.1%", "Faster pages", "Cleaner upsell paths"],
      trustTriggers: ["Before/after conversion case studies", "Specific speed metrics"],
      bestOpeningAngle:
        "Open with their 1.1% number and what a realistic 90-day lift looks like in outdoor apparel.",
      rationale: "Numbers-first clients reward numbers-first proposals.",
    },
    scoreBreakdown: [
      { score: 94, label: "Skill fit", rationale: "Core e-comm + CRO strength." },
      { score: 90, label: "Budget fit", rationale: "$8–12k is healthy for this scope." },
      { score: 92, label: "Client quality", rationale: "Heavy spender, strong track record." },
      { score: 75, label: "Competition", rationale: "Budget filters out low-end freelancers." },
    ],
    competitionRationale: "Lower relative competition at this budget; quality bar is high.",
    verdictRationale: "Top-tier opportunity. Apply with conversion case studies and phased plan.",
    screeningQuestions: [
      {
        id: "sq-4-1",
        jobId: "job-4",
        question: "Share before/after conversion work examples.",
        answer:
          "TrailCo PDP rebuild: 1.4% → 2.3% CVR in 8 weeks (GA4). Alpine Goods theme migration: LCP 4.8s → 1.9s, add-to-cart +18%. Both case write-ups available.",
        reviewScore: 93,
        confidence: 95,
        isLowConfidence: false,
        consistencyBadge: "consistent",
        consistencyNote: "Mirrors portfolio proof in proposal.",
      },
      {
        id: "sq-4-2",
        jobId: "job-4",
        question: "What's your typical timeline for a full rebuild?",
        answer:
          "For a catalog this size: 5–7 weeks — week 1 audit + IA, weeks 2–4 build, week 5 CRO blocks + speed, weeks 6–7 QA + Klaviyo review. Exact dates after scope call.",
        reviewScore: 80,
        confidence: 72,
        isLowConfidence: false,
        consistencyBadge: "consistent",
        consistencyNote: "Timeline matches solution section.",
      },
    ],
    clientQuestions: [],
    attachments: [],
    questionCount: 0,
    hasAttachments: false,
    hasProposal: false,
  },
  {
    id: "job-5",
    title: "Make coaching site pretty on Wix — $200",
    niche: "web-design",
    budget: { type: "fixed", amount: 200, currency: "USD" },
    clientCountry: "United States",
    postedAt: "2026-04-03T20:00:00Z",
    analyzedAt: "2026-04-03T20:30:00Z",
    verdict: "skip",
    fitScore: 22,
    winProbability: 12,
    roiScore: 8,
    competitionEstimate: "high",
    confidence: 94,
    rawTextPreview: rawJob5.slice(0, 140) + "…",
    rawText: rawJob5,
    deliverables: [
      { text: "Color changes on existing Wix site", isHidden: false },
      { text: "Maybe a logo", isHidden: false },
    ],
    clientProfile: {
      decisionStyle: "Impulse hire, price-primary",
      inferredValues: ["Cheap", "Fast"],
      paymentVerified: false,
      spendTier: "New",
      rationale:
        "Unverified payment, extreme urgency, undefined 'pretty.' Classic race-to-bottom post.",
    },
    redFlags: [
      {
        severity: "high",
        title: "Budget incompatible with professional work",
        description: "$200 for design + possible logo is not viable.",
        rationale: "Even a tight logo exploration exceeds this.",
      },
      {
        severity: "high",
        title: "Scope ambiguity + hire-today pressure",
        description: "Recipe for revision loops and disputes.",
        rationale: "Skip protects reputation and calendar.",
      },
      {
        severity: "medium",
        title: "Payment not verified",
        description: "Elevated non-payment risk on Upwork.",
        rationale: "Combined with low budget, hard no.",
      },
    ],
    psychology: {
      fears: ["Looking unprofessional to coaching clients"],
      desiredOutcomes: ["Quick visual refresh"],
      trustTriggers: ["Low price", "Same-day availability"],
      bestOpeningAngle: "N/A — do not apply.",
      rationale: "No productive opening; economics fail.",
    },
    scoreBreakdown: [
      { score: 30, label: "Skill fit", rationale: "Can do it, shouldn't." },
      { score: 5, label: "Budget fit", rationale: "Non-starter." },
      { score: 15, label: "Client quality", rationale: "Unverified, vague." },
      { score: 10, label: "Competition", rationale: "Dozens of low-bid freelancers." },
    ],
    competitionRationale: "Irrelevant — race to the bottom.",
    verdictRationale: "Clear skip. Budget, verification, and scope all fail the bar.",
    screeningQuestions: [],
    clientQuestions: [],
    attachments: [],
    questionCount: 0,
    hasAttachments: false,
    hasProposal: false,
  },
  {
    id: "job-6",
    title: "B2B fintech content strategy + on-page SEO",
    niche: "seo",
    budget: { type: "hourly", min: 50, max: 75, currency: "USD" },
    clientCountry: "United Kingdom",
    postedAt: "2026-03-25T08:00:00Z",
    analyzedAt: "2026-03-26T11:20:00Z",
    verdict: "apply",
    fitScore: 79,
    winProbability: 66,
    roiScore: 77,
    competitionEstimate: "medium",
    confidence: 80,
    rawTextPreview: rawJob6.slice(0, 140) + "…",
    rawText: rawJob6,
    deliverables: [
      { text: "Topical cluster strategy for 40 posts", isHidden: false },
      { text: "Internal linking plan", isHidden: false },
      { text: "Rewrite 8 cornerstone pages", isHidden: false },
    ],
    clientProfile: {
      decisionStyle: "Editorial-quality conscious, compliance-aware",
      inferredValues: ["Substance over fluff", "Ongoing partnership", "Domain expertise"],
      hiringHistory: "Payment verified · $9.4k spent · 4.9 ★ · 6 hires",
      paymentVerified: true,
      spendTier: "$5–10k",
      rating: 4.9,
      jobsPosted: 8,
      hireRate: 0.75,
      rationale: "Strong signals for retained content/SEO work.",
    },
    redFlags: [
      {
        severity: "low",
        title: "Compliance adjacency without examples",
        description: "Fintech content has review overhead not priced in.",
        rationale: "Ask about legal review cycle in proposal question.",
      },
    ],
    psychology: {
      fears: ["Generic SEO content that legal rejects", "Agencies that don't get B2B nuance"],
      desiredOutcomes: ["Authoritative clusters", "Pages sales can actually share"],
      trustTriggers: ["Fintech or regulated-industry samples", "Clear editorial process"],
      bestOpeningAngle:
        "Show you understand boring-but-trusted fintech voice — specificity over hype.",
      rationale: "They literally asked not to be boring while staying compliant.",
    },
    scoreBreakdown: [
      { score: 82, label: "Skill fit", rationale: "Content SEO + clustering strength." },
      { score: 80, label: "Budget fit", rationale: "$50–75/hr is solid for this work." },
      { score: 85, label: "Client quality", rationale: "Verified, high rating, good hire rate." },
      { score: 60, label: "Competition", rationale: "Specialists will compete; samples win." },
    ],
    competitionRationale: "Medium. Differentiator is regulated-industry writing samples.",
    verdictRationale: "Apply — good rate, clear scope, quality client.",
    screeningQuestions: [
      {
        id: "sq-6-1",
        jobId: "job-6",
        question: "Have you written for fintech or compliance-adjacent brands?",
        answer:
          "Yes — cluster strategy for a payments API blog (18 articles) and cornerstone rewrites for a UK open-banking education hub. I can share redacted outlines; full URLs under NDA.",
        reviewScore: 76,
        confidence: 38,
        isLowConfidence: true,
        consistencyBadge: "review",
        consistencyNote:
          "Proposal mentions fintech samples but specific URLs not in knowledge base yet.",
        missingInfoPrompt:
          "Which fintech/compliance projects can we name or link? Add titles or URLs so we don't invent proof.",
      },
    ],
    clientQuestions: [],
    attachments: [],
    questionCount: 0,
    hasAttachments: false,
    hasProposal: false,
  },
  {
    id: "job-7",
    title: "Supplement brand PDP CRO (120 SKUs)",
    niche: "e-commerce",
    budget: { type: "fixed", amount: 5500, currency: "USD" },
    clientCountry: "United States",
    postedAt: "2026-03-22T15:45:00Z",
    analyzedAt: "2026-03-23T09:00:00Z",
    verdict: "apply",
    fitScore: 84,
    winProbability: 61,
    roiScore: 70,
    competitionEstimate: "medium",
    confidence: 75,
    rawTextPreview: rawJob7.slice(0, 140) + "…",
    rawText: rawJob7,
    deliverables: [
      { text: "CRO audit", isHidden: false },
      { text: "New PDP template", isHidden: false },
      { text: "A/B test plan", isHidden: false },
    ],
    clientProfile: {
      decisionStyle: "Experienced but possibly burned by prior freelancers",
      inferredValues: ["Completion", "Health-brand nuance", "Test rigor"],
      hiringHistory: "Payment verified · $16k spent · 4.2 ★ · 9 hires",
      paymentVerified: true,
      spendTier: "$10k+",
      rating: 4.2,
      jobsPosted: 12,
      hireRate: 0.5,
      rationale:
        "Lower hire rate + admission that 2 freelancers didn't finish = trust deficit. Reliability is the sale.",
    },
    redFlags: [
      {
        severity: "high",
        title: "Prior freelancers abandoned work",
        description: "Pattern of incomplete projects — process or client-side blockers.",
        rationale: "Probe for why in screening; propose milestone gates.",
      },
      {
        severity: "medium",
        title: "4.2 client rating",
        description: "Below typical strong clients.",
        rationale: "Read recent feedback before finalizing bid.",
      },
    ],
    psychology: {
      fears: ["Another freelancer who ghosts mid-project", "Generic CRO that ignores supplement claims rules"],
      desiredOutcomes: ["Finished PDP system", "Clear test roadmap"],
      trustTriggers: ["Milestone plan", "Health/supplement portfolio", "Communication cadence"],
      bestOpeningAngle:
        "Address completion risk head-on: weekly demos, milestone payments, written scope freeze.",
      rationale: "They told you freelancers fail them — your proposal must answer that fear first.",
    },
    scoreBreakdown: [
      { score: 88, label: "Skill fit", rationale: "CRO + PDP work is core." },
      { score: 75, label: "Budget fit", rationale: "$5.5k is fair for audit + template + plan." },
      { score: 55, label: "Client quality", rationale: "Mixed — spend ok, rating and history concerning." },
      { score: 58, label: "Competition", rationale: "Health niche narrows field slightly." },
    ],
    competitionRationale: "Medium. Supplement experience is a real filter.",
    verdictRationale:
      "Apply with strong process guarantees. Budget ok; client risk manageable if scoped tightly.",
    screeningQuestions: [],
    clientQuestions: [],
    attachments: [],
    questionCount: 0,
    hasAttachments: false,
    hasProposal: false,
  },
  {
    id: "job-8",
    title: "Law firm logo redesign — committee approval",
    niche: "branding",
    budget: { type: "fixed", amount: 800, currency: "USD" },
    clientCountry: "United States",
    postedAt: "2026-04-02T07:10:00Z",
    analyzedAt: "2026-04-02T13:50:00Z",
    verdict: "skip",
    fitScore: 35,
    winProbability: 18,
    roiScore: 15,
    competitionEstimate: "high",
    confidence: 91,
    rawTextPreview: rawJob8.slice(0, 140) + "…",
    rawText: rawJob8,
    deliverables: [
      { text: "Logo redesign files only", isHidden: false },
      {
        text: "Implicit: endless partner revision rounds",
        isHidden: true,
        rationale: "'Multiple partners will need to approve' with no process = revision hell.",
      },
    ],
    clientProfile: {
      decisionStyle: "Committee / multi-partner veto culture",
      inferredValues: ["Safe aesthetics", "Consensus", "Low cost"],
      paymentVerified: true,
      spendTier: "New",
      rating: 0,
      jobsPosted: 1,
      hireRate: 0,
      rationale: "First job, vague brief, committee approval — high effort, low control.",
    },
    redFlags: [
      {
        severity: "high",
        title: "Committee approval without decision framework",
        description: "Multiple partners, no strategy budget, vague 'modern but trustworthy.'",
        rationale: "Classic unpaid revision trap.",
      },
      {
        severity: "medium",
        title: "Budget too low for stakeholder management",
        description: "$800 cannot fund research + multi-round partner alignment.",
        rationale: "Professional brand systems for law start well above this for strategy-inclusive work.",
      },
      {
        severity: "medium",
        title: "No research or strategy budget",
        description: "Logo-only with subjective taste criteria.",
        rationale: "You will be judged on vibes, not outcomes.",
      },
    ],
    psychology: {
      fears: ["Looking too startup-y", "Alienating older partners"],
      desiredOutcomes: ["A logo everyone can live with"],
      trustTriggers: ["Other law firm logos", "Conservative portfolio"],
      bestOpeningAngle: "N/A — skip unless they fund a proper brand sprint.",
      rationale: "Consensus projects without facilitation budget destroy freelancers.",
    },
    scoreBreakdown: [
      { score: 50, label: "Skill fit", rationale: "Can design logos; context is poor." },
      { score: 20, label: "Budget fit", rationale: "Doesn't cover stakeholder process." },
      { score: 30, label: "Client quality", rationale: "New account, vague, committee risk." },
      { score: 25, label: "Competition", rationale: "Low barrier attracts volume bidding." },
    ],
    competitionRationale: "High volume, low differentiation on price.",
    verdictRationale: "Skip. Committee + $800 + no strategy is a no-win engagement.",
    screeningQuestions: [],
    clientQuestions: [],
    attachments: [],
    questionCount: 0,
    hasAttachments: false,
    hasProposal: false,
  },
];

export function toJobSummary(job: JobAnalysis): JobSummary {
  const {
    id,
    title,
    niche,
    budget,
    clientCountry,
    postedAt,
    analyzedAt,
    verdict,
    fitScore,
    winProbability,
    roiScore,
    competitionEstimate,
    confidence,
    rawTextPreview,
    questionCount,
    hasAttachments,
  } = job;
  return {
    id,
    title,
    niche,
    budget,
    clientCountry,
    postedAt,
    analyzedAt,
    verdict,
    fitScore,
    winProbability,
    roiScore,
    competitionEstimate,
    confidence,
    rawTextPreview,
    questionCount,
    hasAttachments,
  };
}
