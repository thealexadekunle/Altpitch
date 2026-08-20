"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { SERIES, CHART_GRID, CHART_AXIS, tooltipContentStyle } from "@/components/analytics/chart-theme";
import type { HookTypePerformance } from "@/lib/types";

export function HookChart({ data }: { data: HookTypePerformance[] }) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" stroke={CHART_AXIS} fontSize={11} tickLine={false} axisLine={false} unit="%" />
          <YAxis
            type="category"
            dataKey="hookType"
            stroke={CHART_AXIS}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={130}
          />
          <Tooltip contentStyle={tooltipContentStyle} labelStyle={{ color: "hsl(240 5% 92%)" }} cursor={{ fill: "hsl(240 6% 16%)" }} />
          <Bar dataKey="replyRate" name="Reply rate" fill={SERIES.blue} radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
