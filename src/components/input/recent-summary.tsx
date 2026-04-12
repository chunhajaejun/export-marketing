"use client";

import { useEffect, useState } from "react";
import { formatCurrencyShort } from "@/lib/utils/currency-format";

interface DayData {
  date: string;
  total_calls: number;
  valid_calls: number;
  scrap: number;
  absence: number;
  invalid: number;
  spend: number;
  cpa_total: number | null;
  cpa_valid: number | null;
}

export function RecentSummary() {
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/data/recent-summary");
        if (!res.ok) throw new Error("조회 실패");
        const result = await res.json();
        setDays(result);
      } catch {
        setDays([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="text-sm text-[#64748b]">로딩 중...</div>;

  const dayLabels = (date: string) => {
    const d = new Date(date);
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0];

    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const short = `${d.getMonth() + 1}/${d.getDate()} ${dayNames[d.getDay()]}`;

    if (date === today) return { short, tag: "오늘" };
    if (date === yStr) return { short, tag: "어제" };
    return { short, tag: null };
  };

  return (
    <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
      <h3 className="mb-3 text-sm font-bold text-[#e2e8f0]">최근 4일 현황</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center">
          <thead>
            <tr className="text-[#64748b] border-b border-[#334155]">
              <th className="py-2 px-2 text-left">날짜</th>
              <th className="py-2 px-1">전체</th>
              <th className="py-2 px-1 text-[#4ade80]">유효</th>
              <th className="py-2 px-1 text-[#fbbf24]">폐차</th>
              <th className="py-2 px-1 text-[#60a5fa]">부재</th>
              <th className="py-2 px-1 text-[#f87171]">무효</th>
              <th className="py-2 px-1 border-l border-[#334155]">소진액</th>
              <th className="py-2 px-1">CPA</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const label = dayLabels(day.date);
              const hasData = day.total_calls > 0 || day.spend > 0;
              return (
                <tr
                  key={day.date}
                  className={`border-b border-[#334155]/50 ${!hasData ? "text-[#475569]" : "text-[#e2e8f0]"}`}
                >
                  <td className="py-2 px-2 text-left font-medium">
                    {label.short}
                    {label.tag && (
                      <span className="ml-1 text-[10px] text-[#3b82f6]">{label.tag}</span>
                    )}
                  </td>
                  <td className="py-2 px-1 font-bold">{day.total_calls || "-"}</td>
                  <td className="py-2 px-1 text-[#4ade80]">{day.valid_calls || "-"}</td>
                  <td className="py-2 px-1 text-[#fbbf24]">{day.scrap || "-"}</td>
                  <td className="py-2 px-1 text-[#60a5fa]">{day.absence || "-"}</td>
                  <td className="py-2 px-1 text-[#f87171]">{day.invalid || "-"}</td>
                  <td className="py-2 px-1 border-l border-[#334155]">
                    {day.spend > 0 ? formatCurrencyShort(day.spend) : "-"}
                  </td>
                  <td className="py-2 px-1 text-[#4ade80]">
                    {day.cpa_valid ? formatCurrencyShort(day.cpa_valid) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
