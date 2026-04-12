"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils/currency-format";
import { formatDateWithDay } from "@/lib/utils/date-utils";
import { parseISO } from "date-fns";
import type { CallReport, AdSpend, MediaChannel } from "@/lib/types";

const MEDIA_CONFIG: {
  group: string;
  label: string;
  color: string;
  channels: MediaChannel[];
}[] = [
  { group: "naver", label: "네이버", color: "#03C75A", channels: ["naver_web", "naver_landing"] },
  { group: "danggeun", label: "당근", color: "#f97316", channels: ["danggeun"] },
  { group: "meta", label: "메타", color: "#0668E1", channels: ["meta"] },
  { group: "google", label: "구글", color: "#EA4335", channels: ["google"] },
];

interface MediaSwipeCardProps {
  calls: CallReport[];
  spend: AdSpend[];
  startDate: string;
  endDate: string;
}

export function MediaSwipeCard({ calls, spend, startDate, endDate }: MediaSwipeCardProps) {
  // 기간 내 모든 날짜 (최신순 — 오늘이 맨 위)
  const allDates: string[] = [];
  const cur = new Date(endDate);
  const start = new Date(startDate);
  while (cur >= start) {
    allDates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() - 1);
  }

  const [dateIndex, setDateIndex] = useState(0); // 세로 스와이프용 (0 = 오늘)
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mediaIndex, setMediaIndex] = useState(0); // 가로 스와이프용

  const currentDate = allDates[dateIndex] || allDates[0];

  // 해당 날짜의 매체별 데이터
  const summaries = MEDIA_CONFIG.map((cfg) => {
    const mc = calls.filter((c) => c.date === currentDate && cfg.channels.includes(c.media));
    const ms = spend.filter((s) => s.date === currentDate && cfg.channels.includes(s.media));
    const totalCalls = mc.reduce((s, c) => s + c.total_count, 0);
    const validCalls = mc.reduce((s, c) => s + (c.export_count ?? 0) + (c.used_car_count ?? 0) + (c.phone_naver_count ?? 0), 0);
    const totalSpend = ms.reduce((s, sp) => s + sp.amount, 0);
    return {
      ...cfg,
      total_calls: totalCalls,
      valid_calls: validCalls,
      export_count: mc.reduce((s, c) => s + (c.export_count ?? 0), 0),
      used_car_count: mc.reduce((s, c) => s + (c.used_car_count ?? 0), 0),
      scrap_count: mc.reduce((s, c) => s + c.scrap_count, 0),
      absence_count: mc.reduce((s, c) => s + c.absence_count, 0),
      invalid_count: mc.reduce((s, c) => s + c.invalid_count, 0),
      spend: totalSpend,
      cpa_total: totalCalls > 0 ? Math.round(totalSpend / totalCalls) : null,
      cpa_valid: validCalls > 0 ? Math.round(totalSpend / validCalls) : null,
    };
  });

  // 가로 스와이프 핸들러
  const handleHScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.offsetWidth * 0.82;
    const index = Math.round(el.scrollLeft / cardWidth);
    setMediaIndex(Math.min(index, MEDIA_CONFIG.length - 1));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleHScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleHScroll);
  }, [handleHScroll]);

  const isToday = dateIndex === 0;

  return (
    <div className="space-y-3">
      {/* 날짜 네비게이션 (세로 스와이프 대체 — 버튼) */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setDateIndex((i) => Math.min(i + 1, allDates.length - 1))}
          disabled={dateIndex >= allDates.length - 1}
          className="text-xs text-[#94a3b8] hover:text-white disabled:opacity-30"
        >
          ← 이전 날짜
        </button>
        <div className="text-center">
          <span className="text-sm font-bold text-white">
            {formatDateWithDay(parseISO(currentDate))}
          </span>
          {isToday && <span className="ml-2 text-[10px] text-[#3b82f6] bg-[#3b82f6]/20 px-1.5 py-0.5 rounded">오늘</span>}
        </div>
        <button
          onClick={() => setDateIndex((i) => Math.max(i - 1, 0))}
          disabled={dateIndex <= 0}
          className="text-xs text-[#94a3b8] hover:text-white disabled:opacity-30"
        >
          다음 날짜 →
        </button>
      </div>

      {/* 날짜 인디케이터 */}
      <div className="flex justify-center gap-1">
        {allDates.slice(0, 7).map((_, i) => (
          <div
            key={i}
            onClick={() => setDateIndex(i)}
            className={`h-1.5 rounded-full cursor-pointer transition-all ${
              i === dateIndex ? "w-4 bg-[#3b82f6]" : "w-1.5 bg-[#334155]"
            }`}
          />
        ))}
        {allDates.length > 7 && <span className="text-[8px] text-[#475569] ml-1">+{allDates.length - 7}</span>}
      </div>

      {/* 매체별 가로 스와이프 카드 */}
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {summaries.map((s) => (
          <div
            key={s.group}
            className="w-[82%] shrink-0 snap-start rounded-xl border border-[#334155] bg-[#1e293b] p-4"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#e2e8f0]">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </div>
            <div className="grid grid-cols-2 gap-y-2.5 text-sm">
              <div>
                <div className="text-xs text-[#94a3b8]">콜량(유효/전체)</div>
                <div className="text-lg font-bold">
                  <span style={{ color: s.color }}>{s.valid_calls}</span>
                  <span className="ml-1 text-sm font-normal text-[#94a3b8]">/ {s.total_calls}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[#94a3b8]">소진액</div>
                <div className="text-lg font-bold text-[#e2e8f0]">{formatCurrency(s.spend)}</div>
              </div>
              <div>
                <div className="text-xs text-[#94a3b8]">수출/중고매입</div>
                <div className="text-[#4ade80]">{s.export_count} / {s.used_car_count}</div>
              </div>
              <div>
                <div className="text-xs text-[#94a3b8]">폐차/부재/무효</div>
                <div>
                  <span className="text-[#fbbf24]">{s.scrap_count}</span>{" / "}
                  <span className="text-[#60a5fa]">{s.absence_count}</span>{" / "}
                  <span className="text-[#f87171]">{s.invalid_count}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[#94a3b8]">인입단가</div>
                <div className="text-[#94a3b8]">{s.cpa_total != null ? formatCurrency(s.cpa_total) : "-"}</div>
              </div>
              <div>
                <div className="text-xs text-[#94a3b8]">유효단가</div>
                <div style={{ color: s.color }}>{s.cpa_valid != null ? formatCurrency(s.cpa_valid) : "-"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 매체 인디케이터 */}
      <div className="flex justify-center gap-1.5">
        {MEDIA_CONFIG.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${i === mediaIndex ? "bg-[#3b82f6]" : "bg-[#334155]"}`}
          />
        ))}
      </div>
    </div>
  );
}
