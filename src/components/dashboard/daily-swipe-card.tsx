"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils/currency-format";
import { formatDateWithDay } from "@/lib/utils/date-utils";
import { isToday, parseISO } from "date-fns";
import type { DailySummary } from "@/lib/types";

interface DailySwipeCardProps {
  data: DailySummary[];
}

export function DailySwipeCard({ data }: DailySwipeCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.offsetWidth * 0.82;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(index, data.length - 1));
  }, [data.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-[#334155] bg-[#1e293b] text-sm text-[#94a3b8]">
        데이터가 없습니다
      </div>
    );
  }

  // Sort: today first, then descending
  const sorted = [...data].sort((a, b) => {
    const aToday = isToday(parseISO(a.date));
    const bToday = isToday(parseISO(b.date));
    if (aToday && !bToday) return -1;
    if (!aToday && bToday) return 1;
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="space-y-3">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {sorted.map((row) => {
          const today = isToday(parseISO(row.date));

          return (
            <div
              key={row.date}
              className={`w-[82%] shrink-0 snap-start rounded-xl border bg-[#1e293b] p-4 ${
                today ? "border-[#3b82f6]/50" : "border-[#334155]"
              }`}
            >
              <div className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-[#e2e8f0]">
                {formatDateWithDay(parseISO(row.date))}
                {today && (
                  <span className="rounded-full bg-[#3b82f6]/20 px-2 py-0.5 text-[10px] text-[#3b82f6]">
                    오늘
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-y-2.5 text-sm">
                <div>
                  <div className="text-xs text-[#94a3b8]">콜량(유효)</div>
                  <div className="text-lg font-bold text-[#4ade80]">
                    {row.valid_calls}
                    <span className="ml-1 text-sm font-normal text-[#94a3b8]">
                      / {row.total_calls}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#94a3b8]">소진액</div>
                  <div className="text-lg font-bold text-[#e2e8f0]">
                    {formatCurrency(row.total_spend)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#94a3b8]">폐차/부재/무효</div>
                  <div className="text-[#94a3b8]">
                    <span className="text-[#fbbf24]">{row.scrap_count}</span>
                    {" / "}
                    <span className="text-[#60a5fa]">{row.absence_count}</span>
                    {" / "}
                    <span className="text-[#f87171]">{row.invalid_count}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#94a3b8]">CPA 전체/유효</div>
                  <div>
                    <span className="text-[#94a3b8]">
                      {row.cpa_total != null ? formatCurrency(row.cpa_total) : "-"}
                    </span>
                    <span className="mx-1 text-[#334155]">/</span>
                    <span className="text-[#4ade80]">
                      {row.cpa_valid != null ? formatCurrency(row.cpa_valid) : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicators */}
      {sorted.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {sorted.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === activeIndex ? "bg-[#3b82f6]" : "bg-[#334155]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
