"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils/currency-format";
import type { CallReport, AdSpend, MediaChannel } from "@/lib/types";

const MEDIA_CONFIG: {
  group: string;
  label: string;
  color: string;
  channels: MediaChannel[];
}[] = [
  {
    group: "naver",
    label: "네이버",
    color: "#3b82f6",
    channels: ["naver_web", "naver_landing"],
  },
  { group: "danggeun", label: "당근", color: "#f97316", channels: ["danggeun"] },
  { group: "meta", label: "메타", color: "#8b5cf6", channels: ["meta"] },
  { group: "google", label: "구글", color: "#34d399", channels: ["google"] },
];

interface MediaSwipeCardProps {
  calls: CallReport[];
  spend: AdSpend[];
}

interface MediaSummary {
  group: string;
  label: string;
  color: string;
  total_calls: number;
  valid_calls: number;
  export_count: number;
  used_car_count: number;
  scrap_count: number;
  absence_count: number;
  invalid_count: number;
  spend: number;
}

export function MediaSwipeCard({ calls, spend }: MediaSwipeCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.offsetWidth * 0.82;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(index, MEDIA_CONFIG.length - 1));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const summaries: MediaSummary[] = MEDIA_CONFIG.map((cfg) => {
    const mediaCalls = calls.filter((c) => cfg.channels.includes(c.media));
    const mediaSpend = spend.filter((s) => cfg.channels.includes(s.media));

    return {
      group: cfg.group,
      label: cfg.label,
      color: cfg.color,
      total_calls: mediaCalls.reduce((sum, c) => sum + c.total_count, 0),
      valid_calls: mediaCalls.reduce((sum, c) => sum + (c.valid_total ?? 0), 0),
      export_count: mediaCalls.reduce((sum, c) => sum + (c.export_count ?? 0), 0),
      used_car_count: mediaCalls.reduce((sum, c) => sum + (c.used_car_count ?? 0), 0),
      scrap_count: mediaCalls.reduce((sum, c) => sum + c.scrap_count, 0),
      absence_count: mediaCalls.reduce((sum, c) => sum + c.absence_count, 0),
      invalid_count: mediaCalls.reduce((sum, c) => sum + c.invalid_count, 0),
      spend: mediaSpend.reduce((sum, s) => sum + s.amount, 0),
    };
  });

  const hasData = summaries.some((s) => s.total_calls > 0 || s.spend > 0);

  if (!hasData) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-[#334155] bg-[#1e293b] text-sm text-[#94a3b8]">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {summaries.map((s) => {
          const cpaTotal =
            s.total_calls > 0 ? Math.round(s.spend / s.total_calls) : null;
          const cpaValid =
            s.valid_calls > 0 ? Math.round(s.spend / s.valid_calls) : null;

          return (
            <div
              key={s.group}
              className="w-[82%] shrink-0 snap-start rounded-xl border border-[#334155] bg-[#1e293b] p-4"
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#e2e8f0]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </div>
              <div className="grid grid-cols-2 gap-y-2.5 text-sm">
                <div>
                  <div className="text-xs text-[#94a3b8]">콜량(유효/전체)</div>
                  <div className="text-lg font-bold">
                    <span style={{ color: s.color }}>{s.valid_calls}</span>
                    <span className="ml-1 text-sm font-normal text-[#94a3b8]">
                      / {s.total_calls}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#94a3b8]">소진액</div>
                  <div className="text-lg font-bold text-[#e2e8f0]">
                    {formatCurrency(s.spend)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#94a3b8]">수출/중고매입</div>
                  <div className="text-[#4ade80]">
                    {s.export_count} / {s.used_car_count}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#94a3b8]">폐차/부재/무효</div>
                  <div>
                    <span className="text-[#fbbf24]">{s.scrap_count}</span>
                    {" / "}
                    <span className="text-[#60a5fa]">{s.absence_count}</span>
                    {" / "}
                    <span className="text-[#f87171]">{s.invalid_count}</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-[#94a3b8]">CPA 전체 / 유효</div>
                  <div>
                    <span className="text-[#94a3b8]">
                      {cpaTotal != null ? formatCurrency(cpaTotal) : "-"}
                    </span>
                    <span className="mx-1.5 text-[#334155]">/</span>
                    <span style={{ color: s.color }}>
                      {cpaValid != null ? formatCurrency(cpaValid) : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-1.5">
        {summaries.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === activeIndex ? "bg-[#3b82f6]" : "bg-[#334155]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
