"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { format, subDays, startOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";

const MEDIA_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "naver", label: "네이버" },
  { value: "danggeun", label: "당근" },
  { value: "meta", label: "메타" },
  { value: "google", label: "구글" },
] as const;

type Preset = "today" | "week" | "month" | "last_month";

function getPresetRange(preset: Preset): { start: string; end: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");

  switch (preset) {
    case "today":
      return { start: fmt(today), end: fmt(today) };
    case "week":
      return { start: fmt(subDays(today, 6)), end: fmt(today) };
    case "month":
      return { start: fmt(startOfMonth(today)), end: fmt(today) };
    case "last_month": {
      const last = subMonths(today, 1);
      return { start: fmt(startOfMonth(last)), end: fmt(endOfMonth(last)) };
    }
  }
}

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultStart = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const startDate = searchParams.get("start") || defaultStart;
  const endDate = searchParams.get("end") || today;
  const media = searchParams.get("media") || "all";

  const activePreset = useMemo((): Preset | null => {
    const presets: Preset[] = ["today", "week", "month", "last_month"];
    for (const p of presets) {
      const range = getPresetRange(p);
      if (range.start === startDate && range.end === endDate) return p;
    }
    return null;
  }, [startDate, endDate]);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        params.set(key, value);
      }
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handlePreset = (preset: Preset) => {
    const range = getPresetRange(preset);
    updateParams({ start: range.start, end: range.end });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Preset buttons */}
      <div className="flex gap-1.5">
        {([
          ["today", "오늘"],
          ["week", "이번주"],
          ["month", "이번달"],
          ["last_month", "지난달"],
        ] as [Preset, string][]).map(([key, label]) => (
          <Button
            key={key}
            variant={activePreset === key ? "default" : "outline"}
            size="sm"
            onClick={() => handlePreset(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={startDate}
          onChange={(e) => updateParams({ start: e.target.value })}
          className="h-7 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        />
        <span className="text-muted-foreground">~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => updateParams({ end: e.target.value })}
          className="h-7 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        />
      </div>

      {/* Media filter */}
      <div className="flex gap-1.5">
        {MEDIA_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={media === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => updateParams({ media: opt.value })}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
