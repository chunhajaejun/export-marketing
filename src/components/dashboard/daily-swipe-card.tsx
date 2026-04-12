"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {sorted.map((row, i) => {
          const today = isToday(parseISO(row.date));
          const invalidTotal =
            row.scrap_count + row.absence_count + row.invalid_count + row.phone_naver_count;

          return (
            <Card
              key={row.date}
              className={`w-[82%] shrink-0 snap-start ${today ? "ring-2 ring-primary/50" : ""}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-baseline gap-2 text-sm">
                  {formatDateWithDay(parseISO(row.date))}
                  {today && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">
                      오늘
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-2.5 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">콜량(유효)</div>
                  <div className="text-lg font-bold text-blue-400">
                    {row.valid_calls}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / {row.total_calls}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">소진액</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(row.total_spend)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">폐차/부재/무효</div>
                  <div className="text-muted-foreground">
                    {row.scrap_count} / {row.absence_count} / {row.invalid_count}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">CPA 전체/유효</div>
                  <div>
                    <span>{row.cpa_total != null ? formatCurrency(row.cpa_total) : "-"}</span>
                    <span className="mx-1 text-muted-foreground">/</span>
                    <span className="text-blue-400">
                      {row.cpa_valid != null ? formatCurrency(row.cpa_valid) : "-"}
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
        {sorted.map((_, i) => (
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
