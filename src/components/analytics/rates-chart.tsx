"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { SERIES, CHART_GRID, CHART_AXIS, tooltipContentStyle } from "@/components/analytics/chart-theme";
import type { AnalyticsWeekPoint } from "@/lib/types";

export function RatesChart({ series }: { series: AnalyticsWeekPoint[] }) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="space-y-2">
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" stroke={CHART_AXIS} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke={CHART_AXIS}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              unit="%"
              width={44}
            />
            <Tooltip contentStyle={tooltipContentStyle} labelStyle={{ color: "hsl(240 5% 92%)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
            <Area
              type="monotone"
              dataKey="replyRate"
              name="Reply rate"
              stroke={SERIES.blue}
              fill={SERIES.blue}
              fillOpacity={0.12}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="interviewRate"
              name="Interview rate"
              stroke={SERIES.orange}
              fill={SERIES.orange}
              fillOpacity={0.12}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="hireRate"
              name="Hire rate"
              stroke={SERIES.aqua}
              fill={SERIES.aqua}
              fillOpacity={0.12}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <button
        onClick={() => setShowTable((s) => !s)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {showTable ? "Hide" : "View"} as table
      </button>
      {showTable && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Week</th>
                <th className="px-3 py-2 font-medium">Reply %</th>
                <th className="px-3 py-2 font-medium">Interview %</th>
                <th className="px-3 py-2 font-medium">Hire %</th>
              </tr>
            </thead>
            <tbody>
              {series.map((w) => (
                <tr key={w.week} className="border-t border-border">
                  <td className="px-3 py-1.5 tabular-nums">{w.week}</td>
                  <td className="px-3 py-1.5 tabular-nums">{w.replyRate}</td>
                  <td className="px-3 py-1.5 tabular-nums">{w.interviewRate}</td>
                  <td className="px-3 py-1.5 tabular-nums">{w.hireRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
