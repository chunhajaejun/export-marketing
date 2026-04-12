"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { CallReport, MediaChannel } from "@/lib/types";

const MEDIA_COLORS: Record<string, string> = {
  naver: "#03C75A",
  danggeun: "#f97316",
  meta: "#8b5cf6",
  google: "#EA4335",
};

const MEDIA_LABELS: Record<string, string> = {
  naver: "네이버",
  danggeun: "당근",
  meta: "메타",
  google: "구글",
};

function getMediaGroup(media: MediaChannel): string {
  if (media === "naver_web" || media === "naver_landing") return "naver";
  return media;
}

interface MediaPieChartProps {
  calls: CallReport[];
}

export function MediaPieChart({ calls }: MediaPieChartProps) {
  const grouped = new Map<string, number>();

  for (const c of calls) {
    const group = getMediaGroup(c.media);
    grouped.set(group, (grouped.get(group) || 0) + c.total_count);
  }

  const totalCalls = Array.from(grouped.values()).reduce((a, b) => a + b, 0);

  const chartData = Array.from(grouped.entries())
    .map(([media, count]) => ({
      name: MEDIA_LABELS[media] || media,
      value: count,
      color: MEDIA_COLORS[media] || "#888",
      percent: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-[#94a3b8]">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            dataKey="value"
            stroke="none"
            label={({ percent }) => `${percent}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#e2e8f0",
            }}
            labelStyle={{ color: "#e2e8f0" }}
            itemStyle={{ color: "#e2e8f0" }}
            formatter={(value, name) => [`${value}건`, String(name)]}
          />
          <Legend
            formatter={(value: string) => {
              const item = chartData.find((d) => d.name === value);
              return (
                <span style={{ color: "#e2e8f0", fontSize: "12px" }}>
                  {value} {item ? `${item.percent}% (${item.value}건)` : ""}
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
