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
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-[#94a3b8]">
        데이터가 없습니다
      </div>
    );
  }

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
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={{ stroke: "#334155" }}
            tickLine={{ stroke: "#334155" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={{ stroke: "#334155" }}
            tickLine={{ stroke: "#334155" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#e2e8f0",
            }}
            formatter={(value, name) => [
              `${value}건`,
              name === "total" ? "전체콜량" : "유효콜량",
            ]}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="total"
              position="top"
              style={{ fontSize: 11, fill: "#94a3b8" }}
            />
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill="#3b82f6"
                fillOpacity={entry.isToday ? 0.5 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
