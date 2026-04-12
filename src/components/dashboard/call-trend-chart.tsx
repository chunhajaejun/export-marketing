"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { formatDateShort } from "@/lib/utils/date-utils";
import { isToday, parseISO } from "date-fns";
import type { DailySummary } from "@/lib/types";

interface CallTrendChartProps {
  data: DailySummary[];
}

export function CallTrendChart({ data }: CallTrendChartProps) {
  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({
      date: formatDateShort(parseISO(row.date)),
      total: row.total_calls,
      valid: row.valid_calls,
      isToday: isToday(parseISO(row.date)),
    }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--foreground))",
            }}
            formatter={(value, name) => [
              String(value),
              name === "total" ? "전체콜량" : "유효콜량",
            ]}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="total"
              position="top"
              style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill="hsl(var(--primary))"
                fillOpacity={entry.isToday ? 0.5 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
