import type { Proposal } from "@/lib/types";

export const mockProposals: Proposal[] = [
  {
    id: "prop-1",
    jobId: "job-1",
    status: "draft",
    noProofMode: false,
    partial: false,
    updatedAt: "2026-04-03T10:00:00Z",
    strategyAngle:
      "Lead with conversion diagnosis of their 2019-era site, prove with SaaS case studies, offer phased Figma → handoff plan.",
    selectedPortfolioIds: ["port-1", "port-2"],
    sections: [
      {
        key: "hook",
        label: "Hook",
        content:
          "A Series A analytics site that still feels like 2019 usually isn't a visual problem — it's a conversion architecture problem. Visitors can't find the path from 'interesting' to 'start trial.'",
        alternativeContent:
          "I redesign SaaS marketing sites for teams who are done looking early-stage. Quick note on yours: the homepage is likely leaking trials before pricing ever gets a fair shot.",
      },
      {
        key: "businessProblem",
        label: "Business problem",
        content:
          "You're competing with sharper Series A brands while the site still sells the old story. That mismatch costs trial starts and makes sales enablement harder than it should be.",
        alternativeContent:
          "Prospects decide in seconds whether you look like a serious analytics platform. An outdated marketing site forces your product and sales team to over-explain credibility.",
      },
      {
        key: "solution",
        label: "Solution",
        content:
          "I'd run a tight 3–4 week engagement: (1) discovery + conversion brief, (2) homepage/pricing/features in Figma, (3) component library with React-ready handoff. Mobile-first, metric-anchored — not a visual refresh for its own sake.",
        alternativeContent:
          "Process: async audit of analytics + 5 competitor teardowns → problem brief you approve → Figma system for homepage, pricing, features → annotated components for your React team. We freeze scope after the brief so week 3–4 stays shippable.",
      },
      {
        key: "proof",
        label: "Proof",
        content:
          "Recent SaaS work: Northline Analytics marketing redesign lifted trial starts +34% in 60 days. PulseHQ pricing system cut bounce 22%. Happy to walk through the before/after in a 15-minute call.",
        alternativeContent:
          "Two relevant outcomes: +34% trial starts (Northline) and −22% pricing bounce (PulseHQ). Both were Figma systems handed to in-house React teams without design drift.",
      },
      {
        key: "portfolio",
        label: "Portfolio",
        content:
          "• Northline Analytics — SaaS marketing redesign\n• PulseHQ — pricing & packaging pages\n(Links in my profile; I can send passworded case PDFs if useful.)",
        alternativeContent:
          "Most relevant: Northline (analytics SaaS) and PulseHQ (PLG pricing). Both include component libraries and eng handoff notes — same shape as your ask.",
      },
      {
        key: "question",
        label: "Question",
        content:
          "What is the single conversion metric you care about most for this redesign — trial starts, demo requests, or pricing-page progression?",
        alternativeContent:
          "Who owns final design approval on your side, and is engineering available for a mid-project handoff review?",
      },
      {
        key: "cta",
        label: "CTA",
        content:
          "If useful, I can send a 1-page teardown of your current homepage with three specific fix hypotheses — no pitch deck, just the work. Interested?",
        alternativeContent:
          "Open to a 15-minute call this week? I'll come with two homepage hypotheses and a draft timeline against your 3–4 week window.",
      },
    ],
    review: {
      relevance: {
        score: 92,
        label: "Relevance",
        rationale: "Speaks directly to SaaS conversion and their stated deliverables.",
      },
      specificity: {
        score: 88,
        label: "Specificity",
        rationale: "Names their 2019 problem, phases, and real metrics.",
      },
      readability: {
        score: 85,
        label: "Readability",
        rationale: "Short paragraphs, scannable structure.",
      },
      authenticity: {
        score: 80,
        label: "Authenticity",
        rationale: "Sounds human; slight polish still present in hook.",
      },
      trust: {
        score: 90,
        label: "Trust",
        rationale: "Concrete case outcomes with named projects.",
      },
      ctaStrength: {
        score: 84,
        label: "CTA strength",
        rationale: "Low-friction offer (1-page teardown) beats generic 'let's chat.'",
      },
      predictedReplyLikelihood: {
        score: 78,
        label: "Predicted reply",
        rationale: "Strong fit + specific CTA; competition still medium.",
      },
    },
    humanizedDiff: [
      {
        sectionKey: "hook",
        before:
          "I am writing to express my interest in redesigning your SaaS marketing website. As a highly skilled professional…",
        after:
          "A Series A analytics site that still feels like 2019 usually isn't a visual problem — it's a conversion architecture problem.",
        changeNote: "Removed template opener; led with observation.",
      },
      {
        sectionKey: "cta",
        before: "I look forward to hearing from you regarding this opportunity.",
        after:
          "If useful, I can send a 1-page teardown of your current homepage with three specific fix hypotheses — no pitch deck, just the work. Interested?",
        changeNote: "Replaced passive close with specific low-friction offer.",
      },
    ],
  },
  {
    id: "prop-2",
    jobId: "job-3",
    status: "sent",
    noProofMode: false,
    partial: false,
    updatedAt: "2026-03-29T14:20:00Z",
    strategyAngle:
      "Position as guide for non-designer founders; emphasize beauty/CPG proof and decision framework over logo heroics.",
    selectedPortfolioIds: ["port-3", "port-5"],
    sections: [
      {
        key: "hook",
        label: "Hook",
        content:
          "Launching a skincare line without a decision framework for brand choices is how founders end up with a logo everyone 'sort of likes' and packaging that fights the product on shelf.",
        alternativeContent:
          "Most early DTC beauty brands don't fail on product — they fail on looking interchangeable. Your brief already shows you know identity is part of the launch, not a checkbox after.",
      },
      {
        key: "businessProblem",
        label: "Business problem",
        content:
          "You need a system co-founders can defend — logo, color, packaging direction, guidelines — without design fluency. That means facilitation is as important as craft.",
        alternativeContent:
          "Non-designer founders often get stuck between 'too clinical' and 'too Instagram.' The real job is a shared language for decisions before files ship.",
      },
      {
        key: "solution",
        label: "Solution",
        content:
          "I'd run a brand sprint shaped for founders: positioning workshop → 2 direction routes → logo system + color + packaging direction → guidelines PDF. Packaging stays at direction level (not dielines) so $3,500 stays honest.",
        alternativeContent:
          "Four milestones: (1) founder workshop, (2) dual creative routes, (3) refined system, (4) guidelines. Explicit revision caps per milestone so committee energy doesn't melt the budget.",
      },
      {
        key: "proof",
        label: "Proof",
        content:
          "Built identity systems for GlowTheory (clean beauty) and Harbor Soap Co. GlowTheory's rebrand supported a successful retailer pitch deck within one quarter.",
        alternativeContent:
          "CPG/beauty work includes GlowTheory and Harbor Soap. Happy to share the decision worksheets founders used — same tools I'd bring here.",
      },
      {
        key: "portfolio",
        label: "Portfolio",
        content:
          "• GlowTheory — clean beauty identity\n• Harbor Soap Co. — packaging direction + guidelines",
        alternativeContent:
          "GlowTheory (skincare) is the closest analog; Harbor Soap shows packaging-direction discipline at similar budget shape.",
      },
      {
        key: "question",
        label: "Question",
        content:
          "Are both founders available for a 90-minute kickoff workshop in week one, or should we plan async decision checkpoints?",
        alternativeContent:
          "Do you already have product photography / texture direction we should lock before color exploration?",
      },
      {
        key: "cta",
        label: "CTA",
        content:
          "I can share a one-page brand sprint outline tailored to a $3,500 skincare launch — including what we deliberately won't do in packaging. Want it?",
        alternativeContent:
          "Open to a short call where I show how the founder decision worksheet works? 20 minutes, no slides.",
      },
    ],
    review: {
      relevance: {
        score: 90,
        label: "Relevance",
        rationale: "Hits education need and beauty niche explicitly.",
      },
      specificity: {
        score: 86,
        label: "Specificity",
        rationale: "Budget honesty on packaging direction is strong.",
      },
      readability: {
        score: 88,
        label: "Readability",
        rationale: "Clear, founder-friendly language.",
      },
      authenticity: {
        score: 83,
        label: "Authenticity",
        rationale: "Warm guide tone matches preference.",
      },
      trust: {
        score: 85,
        label: "Trust",
        rationale: "Named beauty brands; could add one metric more.",
      },
      ctaStrength: {
        score: 82,
        label: "CTA strength",
        rationale: "Useful artifact offer fits non-designer buyers.",
      },
      predictedReplyLikelihood: {
        score: 74,
        label: "Predicted reply",
        rationale: "Good alignment; beauty specialists still compete.",
      },
    },
    humanizedDiff: [
      {
        sectionKey: "hook",
        before: "Dear Hiring Manager, I would love to help with your brand identity package…",
        after:
          "Launching a skincare line without a decision framework for brand choices is how founders end up with a logo everyone 'sort of likes'…",
        changeNote: "Cut formal salutation; opened with founder-relevant insight.",
      },
    ],
  },
];
