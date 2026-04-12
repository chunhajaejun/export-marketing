"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-3">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {summaries.map((s) => {
          const cpaTotal =
            s.total_calls > 0 ? Math.round(s.spend / s.total_calls) : null;
          const cpaValid =
            s.valid_calls > 0 ? Math.round(s.spend / s.valid_calls) : null;

          return (
            <Card key={s.group} className="w-[82%] shrink-0 snap-start">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-2.5 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">콜량(유효/전체)</div>
                  <div className="text-lg font-bold">
                    <span style={{ color: s.color }}>{s.valid_calls}</span>
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / {s.total_calls}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">소진액</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(s.spend)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">수출/중고매입</div>
                  <div>
                    {s.export_count} / {s.used_car_count}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">폐차/부재/무효</div>
                  <div className="text-muted-foreground">
                    {s.scrap_count} / {s.absence_count} / {s.invalid_count}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs">CPA 전체 / 유효</div>
                  <div>
                    <span>{cpaTotal != null ? formatCurrency(cpaTotal) : "-"}</span>
                    <span className="mx-1.5 text-muted-foreground">/</span>
                    <span style={{ color: s.color }}>
                      {cpaValid != null ? formatCurrency(cpaValid) : "-"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-1.5">
        {summaries.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === activeIndex ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
