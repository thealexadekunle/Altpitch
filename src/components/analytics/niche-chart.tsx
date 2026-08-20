"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { SERIES, CHART_GRID, CHART_AXIS, tooltipContentStyle } from "@/components/analytics/chart-theme";
import type { NichePerformance } from "@/lib/types";

export function NicheChart({ data }: { data: NichePerformance[] }) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke={CHART_AXIS} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke={CHART_AXIS} fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" width={44} />
          <Tooltip contentStyle={tooltipContentStyle} labelStyle={{ color: "hsl(240 5% 92%)" }} cursor={{ fill: "hsl(240 6% 16%)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
          <Bar dataKey="replyRate" name="Reply rate" fill={SERIES.blue} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="interviewRate" name="Interview rate" fill={SERIES.orange} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
