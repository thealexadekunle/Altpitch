import type { AnalyticsData, AnalyticsWeekPoint } from "@/lib/types";

/** 12 weeks of believable noisy series ending ~ early April 2026 */
function buildSeries(): AnalyticsWeekPoint[] {
  const seeds = [
    { analyzed: 6, applied: 3, replied: 1, interviewed: 0, hired: 0 },
    { analyzed: 8, applied: 4, replied: 2, interviewed: 1, hired: 0 },
    { analyzed: 5, applied: 2, replied: 1, interviewed: 0, hired: 0 },
    { analyzed: 9, applied: 5, replied: 2, interviewed: 1, hired: 1 },
    { analyzed: 7, applied: 4, replied: 1, interviewed: 1, hired: 0 },
    { analyzed: 10, applied: 6, replied: 3, interviewed: 1, hired: 0 },
    { analyzed: 8, applied: 5, replied: 2, interviewed: 2, hired: 1 },
    { analyzed: 11, applied: 7, replied: 3, interviewed: 1, hired: 0 },
    { analyzed: 9, applied: 5, replied: 2, interviewed: 1, hired: 1 },
    { analyzed: 12, applied: 8, replied: 4, interviewed: 2, hired: 1 },
    { analyzed: 10, applied: 6, replied: 3, interviewed: 1, hired: 0 },
    { analyzed: 14, applied: 9, replied: 4, interviewed: 2, hired: 1 },
  ];

  const start = new Date("2026-01-13T00:00:00Z");

  return seeds.map((s, i) => {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + i * 7);
    const replyRate = s.applied ? Math.round((s.replied / s.applied) * 100) : 0;
    const interviewRate = s.applied
      ? Math.round((s.interviewed / s.applied) * 100)
      : 0;
    const hireRate = s.applied ? Math.round((s.hired / s.applied) * 100) : 0;
    return {
      week: `W${String(i + 3).padStart(2, "0")}`,
      weekStart: weekStart.toISOString(),
      replyRate,
      interviewRate,
      hireRate,
      ...s,
    };
  });
}

const series = buildSeries();

const totals = series.reduce(
  (acc, w) => {
    acc.analyzed += w.analyzed;
    acc.applied += w.applied;
    acc.replied += w.replied;
    acc.interviewed += w.interviewed;
    acc.hired += w.hired;
    return acc;
  },
  { analyzed: 0, applied: 0, replied: 0, interviewed: 0, hired: 0 }
);

export const mockAnalytics: AnalyticsData = {
  series,
  byNiche: [
    {
      niche: "web-design",
      label: "Web Design",
      replyRate: 42,
      interviewRate: 18,
      applications: 22,
    },
    {
      niche: "e-commerce",
      label: "E-commerce",
      replyRate: 48,
      interviewRate: 22,
      applications: 16,
    },
    {
      niche: "branding",
      label: "Branding",
      replyRate: 35,
      interviewRate: 14,
      applications: 12,
    },
    {
      niche: "seo",
      label: "SEO",
      replyRate: 28,
      interviewRate: 10,
      applications: 14,
    },
  ],
  byHookType: [
    { hookType: "Specific observation", replyRate: 52, applications: 18 },
    { hookType: "Metric-led", replyRate: 47, applications: 14 },
    { hookType: "Process promise", replyRate: 31, applications: 12 },
    { hookType: "Social proof first", replyRate: 38, applications: 10 },
    { hookType: "Question opener", replyRate: 24, applications: 8 },
  ],
  funnel: [
    { stage: "Analyzed", count: totals.analyzed, conversionFromPrevious: null },
    {
      stage: "Applied",
      count: totals.applied,
      conversionFromPrevious: Math.round((totals.applied / totals.analyzed) * 100),
    },
    {
      stage: "Replied",
      count: totals.replied,
      conversionFromPrevious: Math.round((totals.replied / totals.applied) * 100),
    },
    {
      stage: "Interviewed",
      count: totals.interviewed,
      conversionFromPrevious: Math.round((totals.interviewed / totals.replied) * 100),
    },
    {
      stage: "Hired",
      count: totals.hired,
      conversionFromPrevious: Math.round((totals.hired / totals.interviewed) * 100),
    },
  ],
  summary: {
    overallReplyRate: Math.round((totals.replied / totals.applied) * 100),
    overallInterviewRate: Math.round((totals.interviewed / totals.applied) * 100),
    overallHireRate: Math.round((totals.hired / totals.applied) * 100),
  },
};
